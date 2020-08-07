import { Hash, Identity, Namespace, Resources, PeerGroup, MutableObject } from 'hyper-hyper-space';
import { MutableSet } from 'hyper-hyper-space';
import { PeerSource, PeerInfo, LinkupManager } from 'hyper-hyper-space'
import { Shuffle } from 'hyper-hyper-space';

import { PeerGroupSync } from '../sync/PeerGroupSync';
import { SyncTarget } from '../sync/SyncTarget';

import { Device } from './Device';
import { LinkupServer } from './LinkupServer';


/* AccountInfo: 

Create account objects (devices, linkupServers, i.e. the metadata about the account 
itself), load them from the local store, use this info to create a peer group of all 
the account devices, use it to synchronize the account metadata, make it available
to other subsystems to synchronize info at the account level, and lastly make this 
set of account device peers available to other systems as well, facilitating the
creation of peer groups involving other entities.

*/               

class AccountDevices extends PeerGroupSync implements SyncTarget {

    static className = 'hhs-home/v0/AccountInfo';
    
    ownerIdentityHash: Hash;

    namespace?: Namespace;

    owner?: Identity;
    
    devices?: MutableSet<Device>;
    linkupServers?: MutableSet<LinkupServer>;

    // only used if peer is owner of this account:
    accountDevicesPeerGroup?: PeerGroup;

    constructor(ownerIdentityHash: Hash) {
        super();

        this.ownerIdentityHash = ownerIdentityHash;
    }

    async init(resources: Resources): Promise<void> {

        if (this.resources === undefined) {

            await super.init(resources);
    
            this.owner = await resources.store.load(this.ownerIdentityHash);
    
            this.namespace = new Namespace('account-for-' + this.ownerIdentityHash);

            if (this.owner === undefined || !(this.owner instanceof Identity)) {
                throw new Error('Could not load identity for AccountInfo');
            }
    
            this.devices = new MutableSet<Device>();
            this.devices.setAuthor(this.owner);
            this.namespace.define('devices', this.devices);
            this.devices.setResources(resources);

    
            this.linkupServers = new MutableSet<LinkupServer>();
            this.linkupServers.setAuthor(this.owner);
            this.namespace.define('linkupServers', this.linkupServers); 
            this.linkupServers.setResources(resources);
            
        }
    }

    getRootObjects(): IterableIterator<MutableObject> {
        return this.namespace.getAll();
    }

    async loadAndWatchForLocalChanges() {
        await this.devices.loadAndWatchForChanges();
        await this.linkupServers.loadAndWatchForChanges();
    }

    async loadAndSync() {

        if (this.peerGroup === undefined) {
            const peerGroupId = 'hhs-home-' + this.owner?.hash() + '-devices';

            let peerGroup = {
                id:         peerGroupId,
                localPeer:  await this.getLocalDevicePeer(),
                peerSource: this.getAccountDevicePeerSource()
            };

            super.sync(peerGroup);
            this.addSyncTarget(this);
        }

    }

    async getLocalDevicePeer(): Promise<PeerInfo> {
        const deviceHash = this.resources?.config.deviceHash;
        const localDevice = await this.resources?.store.load(deviceHash) as Device;
        return localDevice.asPeer(this.getLinkupServer());
    }

    getAccountDevicePeerSource() : PeerSource {
        return new AccountDevicePeers(this);
    }

    getLinkupServer(): string {
        let linkupServers = Array.from(this.linkupServers.values());

        let linkupServer = LinkupManager.defaultLinkupServer;

        if (linkupServers.length > 0) {
            linkupServer = linkupServers.sort()[0].url;
        }

        return linkupServer;
    }
}

class AccountDevicePeers implements PeerSource {

    accountInfo: AccountDevices;

    constructor(accountInfo: AccountDevices) {
        this.accountInfo = accountInfo;
    }

    async getPeers(count: number): Promise<PeerInfo[]> {
        
        let devices = Array.from(this.accountInfo.devices.values());
        Shuffle.array(devices);

        if (devices.length > count) {
            devices = devices.slice(0, count);
        }

        return devices.map((d: Device) => d.asPeer(this.accountInfo.getLinkupServer()));
        
    }

    async getPeerForEndpoint(endpoint: string): Promise<PeerInfo | undefined> {
        let hash = Device.deviceHashFromEndpoint(endpoint);

        let device = this.accountInfo.devices.get(hash);

        let pi = undefined;

        if (device !== undefined) {
            pi = device.asPeer(this.accountInfo.getLinkupServer());
        }

        return pi;
    }

}

export { AccountDevices };