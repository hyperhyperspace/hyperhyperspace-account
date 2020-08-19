import { Hash, Resources, Shuffle } from 'hyper-hyper-space';
import { PeerInfo, LinkupManager, PeerSource, PeerGroup } from 'hyper-hyper-space';

import { AccountDevices } from '../model/AccountDevices';
import { Device } from '../model/Device';


class AccountDevicesPeerGroup extends PeerGroup {


    ownerIdentityHash: Hash;
    localDeviceHash?: Hash;
    resources?: Resources;

    peerGroupId : string;
    peerSource?  : PeerSource;

    accountDevices?: AccountDevices;


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

        this.accountDevices = new AccountDevices(owner);

        this.accountDevices.setResources(resources);
 
        await this.accountDevices.getDevices().loadAndWatchForChanges();
        await this.accountDevices.getLinkupServers().loadAndWatchForChanges();
        
        this.peerSource = new AccountDevicesPeerSource(this);
    }

    async deinit() {
        this.accountDevices?.getDevices().watchForChanges(false);
        this.accountDevices?.getLinkupServers().watchForChanges(false);
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
        return this.peerSource as PeerSource;
    }

    getLinkupServer(): string {
        let linkupServers = Array.from((this.accountDevices as AccountDevices).getLinkupServers().values());

        let linkupServer = LinkupManager.defaultLinkupServer;

        if (linkupServers.length > 0) {
            linkupServer = linkupServers.sort()[0].url as string;
        }

        return linkupServer;
    }
}

class AccountDevicesPeerSource implements PeerSource {

    peerGroup: AccountDevicesPeerGroup;

    constructor(peerGroup: AccountDevicesPeerGroup) {
        this.peerGroup = peerGroup;
    }

    async getPeers(count: number): Promise<PeerInfo[]> {

        let devices = Array.from((this.peerGroup.accountDevices as AccountDevices).getDevices().values());
        Shuffle.array(devices);

        if (devices.length > count) {
            devices = devices.slice(0, count);
        }

        return devices.map((d: Device) => d.asPeer(this.peerGroup.getLinkupServer()));
        
    }

    async getPeerForEndpoint(endpoint: string): Promise<PeerInfo | undefined> {
        let hash = Device.deviceHashFromEndpoint(endpoint);

        let device = (this.peerGroup.accountDevices as AccountDevices).getDevices().get(hash);

        let pi = undefined;

        if (device !== undefined) {
            pi = device.asPeer(this.peerGroup.getLinkupServer());
        }

        return pi;
    }

}


export { AccountDevicesPeerGroup };