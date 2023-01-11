import Keyring from '@polkadot/keyring';
import { ApiPromise, WsProvider } from '@polkadot/api';
import fs from 'fs';

// read the wsProvider and collection id from process args
const wsProviderUrl = process.argv[2];
const collectionId = +process.argv[3];
const nftsFilename = process.argv[4];
const PHRASE = process.argv[5];

//return error if not all arguments are given
if (!wsProviderUrl || !collectionId || !nftsFilename || !PHRASE) {
  console.log(
    'Usage: node index.js <wsProvider> <collectionId> <nftsFilename> <mnemonic>'
  );
  process.exit(1);
}

console.log('Collection ID:', collectionId);

const nfts = JSON.parse(fs.readFileSync(nftsFilename)); //.slice(0, 2);
console.log('NFTs:', nfts);

// connect to polkadot.js, create unques pallet collection, load the list of nfts and create a new nft for each one - assign the owner to the nft
async function main() {
  console.log('Connecting to', wsProviderUrl);
  const api = await ApiPromise.create({
    provider: new WsProvider(wsProviderUrl),
  });
  console.log('Connected to', wsProviderUrl);

  const keyring = new Keyring({ type: 'sr25519' });

  console.log('Mnemonic:', PHRASE);
  const account = keyring.addFromUri(PHRASE);
  console.log('Admin account:', account.address);

  console.log('Creating NFTs');

  // const res = await new Promise((resolve, reject) => {
  //   api.tx.utility
  //     .batch(
  //       nfts.map((nft) => {
  //         const { id, owner, uuid, ipfs, name, image } = nft;
  //         console.log('Minting', id, 'to', owner);
  //         return api.tx.uniques.mint(collectionId, id, owner);
  //       })
  //     )
  //     .signAndSend(account, (result) => {
  //       console.log(`Current status is ${result.status}`);

  //       if (result.status.isInBlock) {
  //         console.log(
  //           `Transaction included at blockHash ${result.status.asInBlock}`
  //         );
  //         resolve();
  //       } else if (result.status.isFinalized) {
  //         console.log(
  //           `Transaction finalized at blockHash ${result.status.asFinalized}`
  //         );
  //         // unsub();
  //         // resolve();
  //       }
  //     });
  // });
  // console.log('Done', res);

  for (const nft of nfts) {
    const { id, owner, uuid, ipfs, name, image } = nft;
    console.log('Minting', id, 'to', owner);
    const tx = api.tx.uniques.mint(collectionId, id, owner);
    const res = await tx.signAndSend(account, { nonce: -1 });
    // const res = await new Promise((resolve, reject) =>
    //   tx.signAndSend(account, (result) => {
    //     console.log(`Current status is ${result.status}`);

    //     if (result.status.isReady) {
    //       resolve();
    //     } else if (result.status.isInBlock) {
    //       console.log(
    //         `Transaction included at blockHash ${result.status.asInBlock}`
    //       );
    //     } else if (result.status.isFinalized) {
    //       console.log(
    //         `Transaction finalized at blockHash ${result.status.asFinalized}`
    //       );
    //     }
    //   })
    // );
    console.log('Done');
    console.log('Tx hash:');
  }

  const isFrozen = false;

  // console.log('Waiting for 120 seconds');
  // await new Promise((resolve) => setTimeout(resolve, 120_000));

  console.log('Setting metadata');
  for (const nft of nfts) {
    const { id, owner, uuid, ipfs, name, image } = nft;
    const meta = [uuid, name, ipfs, image];
    console.log('Setting metadata for', id, 'to', meta);
    const tx = api.tx.uniques.setMetadata(
      collectionId,
      id,
      JSON.stringify(meta),
      isFrozen
    );
    const res = await tx.signAndSend(account, { nonce: -1 });

    // const res = await tx.signAndSend(account, (result) => {
    //   console.log(`Current status is ${result.status}`);

    //   if (result.status.isInBlock) {
    //     console.log(
    //       `Transaction included at blockHash ${result.status.asInBlock}`
    //     );
    //   } else if (result.status.isFinalized) {
    //     console.log(
    //       `Transaction finalized at blockHash ${result.status.asFinalized}`
    //     );
    //     // unsub();
    //     // resolve();
    //   }
    // });
    console.log('Done');
  }

  // console.log('Waiting for 15 seconds');
  // await new Promise((resolve) => setTimeout(resolve, 15_000));

  console.log('Sending tokens');
  for (const nft of nfts) {
    const { id, owner, uuid, ipfs, name, image } = nft;
    console.log('Sending tokens to', owner);
    const tx = api.tx.balances.transfer(owner, 1000 * 1_000_000_000_000);
    const res = await tx.signAndSend(account, { nonce: -1 });
    console.log('Done');
  }

  console.log('Done');
}

main();
