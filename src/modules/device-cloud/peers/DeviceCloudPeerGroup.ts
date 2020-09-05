import { Hash, Resources, Shuffle } from 'hhs';
import { PeerInfo, LinkupManager, PeerSource, PeerGroup } from 'hhs';

import { OwnDevices } from '../model/OwnDevices';
import { Device } from '../model/Device';


class DeviceCloudPeerGroup extends PeerGroup {


    ownerIdentityHash: Hash;
    localDeviceHash?: Hash;
    resources?: Resources;

    peerGroupId : string;
    peerSource?  : PeerSource;

    ownDevices?: OwnDevices;


    constructor(ownerIdentityHash: Hash, localDeviceHash?: Hash) {
        super();

        this.ownerIdentityHash = ownerIdentityHash;
        this.peerGroupId = 'hhs-home-' + this.ownerIdentityHash + '-device-group';

        this.localDeviceHash = localDeviceHash;    // only if there's a local peer !
    }

    async init(resources: Resources) {
        this.resources = resources;

        
        //this.ownerIdentityHash = localPeer.identityHash;

        let owner = await resources.store.load(this.ownerIdentityHash);

        this.ownDevices = new OwnDevices(owner);

        this.ownDevices.setResources(resources);
 
        await this.ownDevices.getDevices().loadAndWatchForChanges();
        await this.ownDevices.getLinkupServers().loadAndWatchForChanges();
        
        this.peerSource = new OwnDevicesPeerSource(this);
    }

    async deinit() {
        this.ownDevices?.getDevices().watchForChanges(false);
        this.ownDevices?.getLinkupServers().watchForChanges(false);
    }

    getResources(): Resources {

        if (this.resources === undefined) {
            throw new Error('OwnDevices has not been initialized: resources is undefined.');
        } else {
            return this.resources;
        }
        
    }

    getPeerGroupId() : string {
        return this.peerGroupId;
    }

    async getLocalPeer(): Promise<PeerInfo> {
        
        if (this.resources === undefined) {
            throw new Error('OwnDevices has not been initialized: localDevicePeer is undefined.');
        } else if (this.localDeviceHash === undefined) {
            throw new Error('This OwnDevices instance does not have a configured local device: localPeer is undefined.');
        }

        const localDevice = await this.getResources().store.load(this.localDeviceHash) as Device;
        return localDevice.asPeer(this.getLinkupServer());
    }
    
    async getPeerSource() : Promise<PeerSource> {
        return this.peerSource as PeerSource;
    }

    getLinkupServer(): string {
        let linkupServers = Array.from((this.ownDevices as OwnDevices).getLinkupServers().values());

        let linkupServer = LinkupManager.defaultLinkupServer;

        if (linkupServers.length > 0) {
            linkupServer = linkupServers.sort()[0].url as string;
        }

        return linkupServer;
    }
}

class OwnDevicesPeerSource implements PeerSource {

    peerGroup: DeviceCloudPeerGroup;

    constructor(peerGroup: DeviceCloudPeerGroup) {
        this.peerGroup = peerGroup;
    }

    async getPeers(count: number): Promise<PeerInfo[]> {

        let devices = Array.from((this.peerGroup.ownDevices as OwnDevices).getDevices().values());
        Shuffle.array(devices);

        if (devices.length > count) {
            devices = devices.slice(0, count);
        }

        return devices.map((d: Device) => d.asPeer(this.peerGroup.getLinkupServer()));
        
    }

    async getPeerForEndpoint(endpoint: string): Promise<PeerInfo | undefined> {
        let hash = Device.deviceHashFromEndpoint(endpoint);

        let device = (this.peerGroup.ownDevices as OwnDevices).getDevices().get(hash);

        let pi = undefined;

        if (device !== undefined) {
            pi = device.asPeer(this.peerGroup.getLinkupServer());
        }

        return pi;
    }

}


export { DeviceCloudPeerGroup };