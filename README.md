# Odyssey NFT restoring util

This util can be used to restore the NFTs from the Odyssey blockchain stored in json file after blockchain reset.

It creates the NFTs in `uniques` pallet, sets the metadatas and also sends some tokens from admin account to the NFT owner.

The only drawback is that it doesn't restore the stacking infos.

Usage:

`node . <ws_endpoint> <collection_id> <json_file> <mnemonic_for_admin_account>`

Example:

```bash
node . wss://drive.antst.net:19947 3 ./odyssey-nfts-20230111.json 'lorem ipsum dolor sit amet'
```
