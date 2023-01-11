import { ApiPromise, WsProvider } from '@polkadot/api';
import { compactStripLength, u8aToString } from '@polkadot/util';
import fs from 'fs';

// read the wsProvider and collection id from process args
const wsProviderUrl = process.argv[2];
const collectionId = +process.argv[3];

//return error if not all arguments are given
if (!wsProviderUrl || !collectionId) {
  console.log('Usage: node backup_nfts.js <wsProvider> <collectionId>');
  process.exit(1);
}

console.log('Collection ID:', collectionId);

// connect to polkadot.js, create unques pallet collection, load the list of nfts and create a new nft for each one - assign the owner to the nft
async function main() {
  console.log('Connecting to', wsProviderUrl);
  const api = await ApiPromise.create({
    provider: new WsProvider(wsProviderUrl),
  });
  console.log('Connected to', wsProviderUrl);

  const nftsItemsInfos = await api.query.uniques.asset.keys();
  console.log('nftsItemsInfos', nftsItemsInfos);
  const collectionItemIds = nftsItemsInfos.map((nftItemInfo) => {
    const [collectionId, itemId] = nftItemInfo.args;
    return [collectionId.toNumber(), itemId.toNumber()];
  });
  console.log('collectionItemIds', collectionItemIds);
  const [itemMetadatas, nftItemsDetailedInfos] = await Promise.all([
    api.query.uniques.instanceMetadataOf.multi(collectionItemIds),
    api.query.uniques.asset.multi(collectionItemIds),
  ]);

  console.log('metadatas', itemMetadatas, itemMetadatas?.toJSON?.());
  const nftItems = await Promise.all(
    itemMetadatas.map(async (itemMetadata, index) => {
      const [collectionId, itemId] = collectionItemIds[index];

      try {
        const data = itemMetadataToString(itemMetadata);

        const itemDetailedInfo = nftItemsDetailedInfos[index];
        // console.log('itemDetailedInfo', itemDetailedInfo.toHuman());
        const owner = itemDetailedInfo.unwrapOr(null)?.owner?.toString();

        if (!data) {
          return null;
        }

        let metadataStr = data;
        // if (isIpfsHash(data)) {
        //   console.log('fetch from IPFS', data);
        //   // TODO timeout
        //   metadataStr = await fetchIpfs(data);
        // }
        // if (!metadataStr) {
        //   return null;
        // }

        let metadata = JSON.parse(metadataStr);
        if (Array.isArray(metadata)) {
          const [uuid, name, ipfs, image] = metadata;
          metadata = { uuid, ipfs, name, image };
          // if (isIpfsHash(ipfs)) {
          //   console.log('fetch from IPFS', ipfs);
          //   // TODO timeout
          //   metadataStr = await fetchIpfs(ipfs);
          //   if (metadataStr) {
          //     const additionalMetadata = JSON.parse(metadataStr);
          //     metadata = {...metadata, ...additionalMetadata};
          //   }
          // }
        }

        if (!metadata?.name || !metadata?.uuid) {
          console.log('Incomplete metadata', metadata);
          return null;
        }

        return {
          collectionId,
          id: itemId,
          owner,
          ...metadata,
        };
      } catch (e) {
        console.log(
          'Unable to parse/fetch NFT metadata',
          itemMetadata,
          itemMetadata?.toHuman(),
          itemMetadata?.unwrapOr(null)?.data,
          '| Error:',
          e
        );
      }

      return null;
    })
  ).then((nftItems) => nftItems.filter((nftItem) => !!nftItem));

  console.log('NftItems', JSON.stringify(nftItems, null, 2));
  // store to file
  fs.writeFileSync(
    `odyssey-nfts-${new Date().toISOString()}.json`,
    JSON.stringify(nftItems, null, 2)
  );
  console.log('Done');
}

main();

function itemMetadataToString(itemMetadata) {
  const codecData = itemMetadata?.unwrapOr(null)?.data;
  if (!codecData) {
    return null;
  }
  // it seems to be Parity SCALE codec with some "compact" length prefix
  // we need to remove it to get raw data
  const [, rawData] = compactStripLength(codecData?.toU8a?.());
  // console.log('rawData', rawData);

  const data = u8aToString(rawData);
  // console.log('data', data);

  return data;
}
