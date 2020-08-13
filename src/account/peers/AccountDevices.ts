import { Hash, PeerGroupInfo, Resources, Identity, PeerInfo, MutableSet, SharedNamespace, LinkupManager, PeerSource, Shuffle } from 'hyper-hyper-space';
import { PeerGroup } from '../../sync/PeerGroup';

import { AccountDevicesInfo } from '../shared/AccountDevicesInfo';

import { Device } from '../data/Device';


class AccountDevices extends PeerGroup {


    ownerIdentityHash: Hash;

    localDeviceHash?: Hash;

    resources?: Resources;

    deviceInfo?: AccountDevicesInfo;

    peerGroupId : string;
    peerSource?  : PeerSource;

    constructor(ownerIdentityHash: Hash, localDeviceHash?: Hash) {
        super();

        this.ownerIdentityHash = ownerIdentityHash;
        this.peerGroupId = 'hhs-home-' + this.ownerIdentityHash + '-device-group';

        this.localDeviceHash   = localDeviceHash;    // only if there's a local peer !
    }

    async init(resources: Resources) {
        this.resources = resources;

        
        //this.ownerIdentityHash = localPeer.identityHash;

        this.deviceInfo = new AccountDevicesInfo(this.ownerIdentityHash);

        this.deviceInfo.init(resources);
 
        await this.deviceInfo.getDevices().loadAndWatchForChanges();
        await this.deviceInfo.getLinkupServers().loadAndWatchForChanges();
        
        this.peerSource = new AccountDevicePeers(this);
    }

    getResources(): Resources {

        if (this.resources === undefined) {
            throw new Error('AccountDevices has not been initialized: resources is undefined.');
        } else {
            return this.resources;
        }
        
    }

    getPeerGroupId() : string {
        return this.peerGroupId;
    }

    async getLocalPeer(): Promise<PeerInfo> {
        
        if (this.resources === undefined) {
            throw new Error('AccountDevices has not been initialized: localDevicePeer is undefined.');
        } else if (this.localDeviceHash === undefined) {
            throw new Error('This AccountDevices instance does not have a configured local device: localPeer is undefined.');
        }

        const localDevice = await this.getResources().store.load(this.localDeviceHash) as Device;
        return localDevice.asPeer(this.getLinkupServer());
    }
    
    async getPeerSource() : Promise<PeerSource> {
        return this.peerSource;
    }

    getLinkupServer(): string {
        let linkupServers = Array.from(this.deviceInfo.getLinkupServers().values());

        let linkupServer = LinkupManager.defaultLinkupServer;

        if (linkupServers.length > 0) {
            linkupServer = linkupServers.sort()[0].url as string;
        }

        return linkupServer;
    }
}

class AccountDevicePeers implements PeerSource {

    devicesPeerGroup: AccountDevices;

    constructor(devicesPeerGroup: AccountDevices) {
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


export { AccountDevices as AccountDevices };