import { Hash, Identity, Namespace, Resources } from 'hyper-hyper-space';
import { MutableSet } from 'hyper-hyper-space';
import { PeerSource, PeerInfo, LinkupManager } from 'hyper-hyper-space'
import { Shuffle } from 'hyper-hyper-space';

import { Device } from './Device';
import { LinkupServer } from './LinkupServer';


class AccountInfo {

    static className = 'hhs-home/v0/AccountInfo';
    
    ownerHash: Hash;
    initialized: boolean;

    sharedMutables?: Namespace;

    owner?: Identity;
    devices?: MutableSet<Device>;
    linkupServers?: MutableSet<LinkupServer>;

    constructor(ownerHash: Hash) {
        this.ownerHash = ownerHash;
        this.initialized = false;
    }

    async init(resources: Resources): Promise<void> {

        if (!this.initialized) {

            this.sharedMutables = new Namespace('account-info-for-' + this.ownerHash);

            let store = resources.store;
    
            this.owner = await store.load(this.ownerHash);
    
            if (this.owner === undefined || !(this.owner instanceof Identity)) {
                throw new Error('Could not load identity for AccountInfo');
            }
    
            this.devices = new MutableSet<Device>();
            this.devices.setAuthor(this.owner);
            this.sharedMutables.define('devices', this.devices);
    
            this.linkupServers = new MutableSet<LinkupServer>();
            this.linkupServers.setAuthor(this.owner);
            this.sharedMutables.define('linkupServers', this.linkupServers);   
            
            this.devices.setResources(resources);
            await this.devices.loadAndWatchForChanges();
    
            this.linkupServers.setResources(resources);
            await this.linkupServers.loadAndWatchForChanges();

            this.initialized = true;
        }
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



export { AccountInfo };