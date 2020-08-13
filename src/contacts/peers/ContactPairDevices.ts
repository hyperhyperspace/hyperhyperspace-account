import { Hash, Resources, PeerInfo, PeerSource, JoinPeerSources } from 'hyper-hyper-space';

import { PeerGroup } from '../../sync/PeerGroup';

import { AccountDevices } from '../../account/peers/AccountDevices';


class ContactPairDevices extends PeerGroup {

    ownAccountDevices   : AccountDevices;
    contactIdentityHash : Hash;

    resources?: Resources;

    contactAccountDevices?: AccountDevices;

    peerGroupId? : string;
    peerSource?  : PeerSource; 

    constructor(ownAccountDevices: AccountDevices, contactIdentityHash: Hash) {
        super();

        this.ownAccountDevices = ownAccountDevices;
        this.contactIdentityHash = contactIdentityHash;
    }

    async init(resources: Resources) {

        this.resources = resources;

        let identityHashes = [this.ownAccountDevices.ownerIdentityHash,
                              this.contactIdentityHash];

        identityHashes.sort();

        this.peerGroupId = 'hhs-home-contact-pair-' +
                           identityHashes[0] + '-' +
                           identityHashes[1] + '-devices';

        this.contactAccountDevices = new AccountDevices(this.contactIdentityHash);
        await this.contactAccountDevices.init(resources);
        
        this.peerSource = new JoinPeerSources([await this.ownAccountDevices.getPeerSource(),
                                               await this.contactAccountDevices.getPeerSource()]);

    }

    getResources(): Resources {
        
        if (this.resources === undefined) {
            throw new Error('ContactPairDevices is not initialized: resources is undefined.');
        } else {
            return this.resources;
        }
    }

    getPeerGroupId(): string {
        if (this.peerGroupId === undefined) {
            throw new Error('ContactPairDevices is not initialized: peerGroupId is undefined.');
        } else {
            return this.peerGroupId;
        }
    }

    getLocalPeer(): Promise<PeerInfo> {
        return this.ownAccountDevices.getLocalPeer();
    }

    async getPeerSource(): Promise<PeerSource> {
        if (this.peerSource === undefined) {
            throw new Error('ContactPairDevices is not initialized: peerSource is undefined.');
        } else {
            return this.peerSource;
        }
        
    }



}

export { ContactPairDevices };