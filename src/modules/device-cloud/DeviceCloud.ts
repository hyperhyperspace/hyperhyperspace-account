import { Hash, Resources, SyncMode, HashedObject } from 'hhs';
import { PeerGroupSync } from 'hhs';
import { DeviceCloudPeerGroup } from './peers/DeviceCloudPeerGroup';

import { Module } from 'util/Module';

class DeviceCloud extends Module {

    ownerIdentityHash: Hash;
    localDeviceHash?: Hash;

    peerGroup: DeviceCloudPeerGroup;
    peerGroupSync: PeerGroupSync;

    constructor(ownerIdentityHash: Hash, localDeviceHash?: Hash) {
        super();

        this.ownerIdentityHash = ownerIdentityHash;
        this.localDeviceHash   = localDeviceHash;

        this.peerGroup     = new DeviceCloudPeerGroup(ownerIdentityHash, localDeviceHash);
        this.peerGroupSync = new PeerGroupSync(this.peerGroup);
    }

    async init(resources: Resources) {
        await this.peerGroup.init(resources);
        await this.peerGroupSync.setResources(resources);
        this.peerGroupSync.addSyncTarget(this.peerGroup.ownDevices as HashedObject, SyncMode.recursive);
        
        this.addModuleSync(this.peerGroupSync);
    }

    getPeers() {
        return this.peerGroup;
    }

    getSync() {
        return this.peerGroupSync;
    }

}

export { DeviceCloud }