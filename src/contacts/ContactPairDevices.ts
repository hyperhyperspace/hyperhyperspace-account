import { Hash, Namespace, Resources, Identity, PeerGroupInfo, PeerInfo, PeerSource, JoinPeerSources, MutableObject } from 'hyper-hyper-space';
import { AccountDevices } from '../account/AccountDevices';
import { PeerGroup } from '../sync/PeerGroup';



class ContactPairDevices extends PeerGroup {

    ownAccountDevices: AccountDevices;

    contactIdentityHash: Hash;
    contactAccountDevices: AccountDevices;

    contact?: Identity;

    constructor(ownAccountDevices: AccountDevices, contactIdentityHash: Hash) {
        super();

        this.ownAccountDevices = ownAccountDevices;

        this.contactIdentityHash = contactIdentityHash;
        this.contactAccountDevices  = new AccountDevices(contactIdentityHash);
    }

    async init(resources: Resources) {
        if (this.resources === undefined) {
            
            await super.init(resources);

            this.contact = await resources.store.load(this.contactIdentityHash);

            this.contactAccountDevices.init(resources);
        }
    }

    async localSync() {
        this.contactAccountDevices.localSync();
    }

    async remoteSync() {

        if (this.peerGroupInfo === undefined) {
            let identityHashes = [this.ownAccountDevices.ownerIdentityHash, 
                                  this.contactIdentityHash];

            identityHashes.sort();

            const peerGroupId = 'hhs-contact-pair-' + 
                        identityHashes[0] + '-' + 
                        identityHashes[1] + '-devices';

            let peerGroupInfo = {
                id:         peerGroupId,
                localPeer:  await this.ownAccountDevices.getLocalDevicePeer(),
                peerSource: new JoinPeerSources([
                            this.ownAccountDevices.getAccountDevicePeerSource(), 
                            this.contactAccountDevices.getAccountDevicePeerSource()
                        ])
            };

            super.sync(peerGroupInfo);
            this.addSyncTarget(this.ownAccountDevices);
            this.addSyncTarget(this.contactAccountDevices);
        }
    }
}

export { ContactPairDevices };