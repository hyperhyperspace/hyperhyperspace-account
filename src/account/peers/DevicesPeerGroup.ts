import { Hash, PeerGroupInfo, Resources, Identity, PeerInfo, MutableSet, SharedNamespace, LinkupManager, PeerSource, Shuffle } from 'hyper-hyper-space';
import { PeerGroup } from '../../sync/PeerGroup';

import { SharedDeviceInfo } from '../shared/SharedDeviceInfo';

import { Device } from '../data/Device';


class DevicesPeerGroup extends PeerGroup {


    ownerIdentityHash?: Hash;

    resources?: Resources;
    peerGroupInfo?: PeerGroupInfo;

    deviceInfo?: SharedDeviceInfo;

    constructor() {
        super();
    }

    async init(resources: Resources) {
        this.resources = resources;

        const localPeer  = await this.getLocalDevicePeer();
        const peerSource = this.getAccountDevicesPeerSource();

        this.ownerIdentityHash = localPeer.identityHash;

        this.deviceInfo = new SharedDeviceInfo(this.ownerIdentityHash);

        this.deviceInfo.init(resources);
 
        await this.deviceInfo.getDevices().loadAndWatchForChanges();
        await this.deviceInfo.getLinkupServers().loadAndWatchForChanges();

        const peerGroupId = 'hhs-home-' + this.ownerIdentityHash + '-device-group';

        this.peerGroupInfo = {
            id:         peerGroupId,
            localPeer:  localPeer,
            peerSource: peerSource
        };

    }

    getResources(): Resources {

        if (this.resources === undefined) {
            throw new Error('DevicesPeerGroup has not been initialized: resources is undefined.');
        } else {
            return this.resources;
        }
        
    }

    getPeerGroupInfo(): PeerGroupInfo {
        
        if (this.peerGroupInfo === undefined) {
            throw new Error('DevicesPeerGroup has not been initialized: peerGroupInfo is undefined.');
        } else {
            return this.peerGroupInfo;
        }
    }

    async getLocalDevicePeer(): Promise<PeerInfo> {
        const deviceHash = this.getResources().config.deviceHash;
        const localDevice = await this.getResources().store.load(deviceHash) as Device;
        return localDevice.asPeer(this.getLinkupServer());
    }

    getLinkupServer(): string {
        let linkupServers = Array.from(this.deviceInfo.getLinkupServers().values());

        let linkupServer = LinkupManager.defaultLinkupServer;

        if (linkupServers.length > 0) {
            linkupServer = linkupServers.sort()[0].url as string;
        }

        return linkupServer;
    }

    getAccountDevicesPeerSource() : PeerSource {
        return new AccountDevicePeers(this);
    }
    

}

class AccountDevicePeers implements PeerSource {

    devicesPeerGroup: DevicesPeerGroup;

    constructor(devicesPeerGroup: DevicesPeerGroup) {
        this.devicesPeerGroup = devicesPeerGroup;
    }

    async getPeers(count: number): Promise<PeerInfo[]> {
        
        let devices = Array.from(this.devicesPeerGroup.deviceInfo.getDevices().values());
        Shuffle.array(devices);

        if (devices.length > count) {
            devices = devices.slice(0, count);
        }

        return devices.map((d: Device) => d.asPeer(this.devicesPeerGroup.getLinkupServer()));
        
    }

    async getPeerForEndpoint(endpoint: string): Promise<PeerInfo | undefined> {
        let hash = Device.deviceHashFromEndpoint(endpoint);

        let device = this.devicesPeerGroup.deviceInfo.getDevices().get(hash);

        let pi = undefined;

        if (device !== undefined) {
            pi = device.asPeer(this.devicesPeerGroup.getLinkupServer());
        }

        return pi;
    }

}


export { DevicesPeerGroup };