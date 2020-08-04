import { Resources, Store, Mesh, Hash } from 'hyper-hyper-space';
import { PeerInfo, PeerSource, HashBasedPeerSource } from 'hyper-hyper-space';

import { PeerGroupSync } from '../util/PeerGroupSync';

import { Device } from './Device';
import { AccountInfo } from './AccountInfo';
import { AccountDevicePeers } from './AccountDevicePeers';


class AccountDeviceSync extends PeerGroupSync {

    accountInfo: AccountInfo;

    resources?: Resources;

    accountPeerGroupId?: string;
    localDevice?: Device;
    devicesPeerSource?: PeerSource;


    constructor(accountInfo: AccountInfo) {
        super();

        this.accountInfo = accountInfo;
    }

    async init(resources: Resources) {

        this.resources = resources;

        let deviceHash = resources?.config.deviceHash;
        this.localDevice = await resources.store.load(deviceHash) as Device;

        this.accountPeerGroupId = 'hhs-home-' + this.accountInfo?.owner?.hash() + '-devices';

        // create a PeerSource that will feed all the account's devices into a PeerGroup.

        this.devicesPeerSource = new AccountDevicePeers(this.accountInfo);
    }


    getMesh(): Mesh {
        if (this.resources?.mesh === undefined) {
            throw new Error("Account sync not initialized.");
        }

        return this.resources.mesh;
    }

    getPeerGroupId(): string {
        if (this.accountPeerGroupId === undefined) {
            throw new Error("Method not implemented.");
        } 

        return this.accountPeerGroupId;
    }

    getLocalPeer(): PeerInfo {
        if (this.localDevice === undefined) {
            throw new Error("Account sync not initialized.");
        }

        return this.localDevice.asPeer(this.accountInfo.getLinkupServer());
    }

    getPeerSource(): PeerSource {
        if (this.devicesPeerSource === undefined) {
            throw new Error("Method not implemented.");
        }
        
        return this.devicesPeerSource;
    }
    
}

export { AccountDeviceSync };