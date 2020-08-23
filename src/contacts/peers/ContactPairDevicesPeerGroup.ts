import { Hash, Resources } from 'hhs';

import { PeerInfo, PeerSource, JoinPeerSources, PeerGroup } from 'hhs';

import { AccountDevicesPeerGroup } from '../../account/peers/AccountDevicesPeerGroup';


class ContactPairDevicesPeerGroup extends PeerGroup {

    ownPeerGroup   : AccountDevicesPeerGroup;
    contactIdentityHash : Hash;

    resources?: Resources;

    contactPeerGroup?: AccountDevicesPeerGroup;

    peerGroupId? : string;
    peerSource?  : PeerSource; 

    constructor(ownPeerGroup: AccountDevicesPeerGroup, contactIdentityHash: Hash) {
        super();

        this.ownPeerGroup = ownPeerGroup;
        this.contactIdentityHash = contactIdentityHash;
    }

    async init(resources: Resources) {

        this.resources = resources;

        let identityHashes = [this.ownPeerGroup.ownerIdentityHash,
                              this.contactIdentityHash];

        identityHashes.sort();

        this.peerGroupId = 'hhs-home-contact-pair-' +
                           identityHashes[0] + '-' +
                           identityHashes[1] + '-devices';

        this.contactPeerGroup = new AccountDevicesPeerGroup(this.contactIdentityHash);
        await this.contactPeerGroup.init(resources);
        
        this.peerSource = new JoinPeerSources([await this.ownPeerGroup.getPeerSource(),
                                               await this.contactPeerGroup.getPeerSource()]);

    }

    async deinit() {
        await this.contactPeerGroup?.deinit();
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
        return this.ownPeerGroup.getLocalPeer();
    }

    async getPeerSource(): Promise<PeerSource> {
        if (this.peerSource === undefined) {
            throw new Error('ContactPairDevices is not initialized: peerSource is undefined.');
        } else {
            return this.peerSource;
        }
        
    }



}

export { ContactPairDevicesPeerGroup };