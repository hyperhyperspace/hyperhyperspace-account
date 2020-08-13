import { MutableObject, Hash, Namespace, Resources, Identity, MutableSet } from 'hyper-hyper-space';

import { SharedNamespace } from '../../sync/SharedNamespace';

import { Device } from '../data/Device';
import { LinkupServer } from '../data/LinkupServer';


class AccountDevicesInfo implements SharedNamespace {

    ownerIdentityHash: Hash;

    namespace: Namespace;

    devices?: MutableSet<Device>;
    linkupServers?: MutableSet<LinkupServer>;

    constructor(ownerIdentityHash: Hash) {
        this.ownerIdentityHash = ownerIdentityHash;

        this.namespace = new Namespace('account-devices-for-' + this.ownerIdentityHash); 
    }

    id(): string {
        return this.namespace.id;
    }

    async init(resources: Resources) {

        let owner = await resources.store.load(this.ownerIdentityHash) as Identity | undefined;

        if (owner === undefined) {
            throw new Error('Cannot initialize account shared namespace, owner identity is not present in the store!');
        }

        this.devices = new MutableSet<Device>();
        this.devices.setAuthor(owner);
        this.devices.setResources(resources);
        this.namespace.define('devices', this.devices);
        
        this.linkupServers = new MutableSet<LinkupServer>();
        this.linkupServers.setAuthor(owner);
        this.linkupServers.setResources(resources);
        this.namespace.define('linkupServers', this.linkupServers);
    }

    get(name: string): MutableObject | undefined {
        return this.namespace.get(name);
    }

    getAllObjects(): IterableIterator<MutableObject> {
        return this.namespace.getAll();
    }

    getDevices() {
        if (this.devices === undefined) {
            throw new Error('AccountDevicesInfo has not been initialized: devices is undefined.');
        } else {
            return this.devices;
        }
    }

    getLinkupServers() {
        if (this.linkupServers === undefined) {
            throw new Error('AccountDevicesInfo has not been initialized: linkupServers is undefined.');
        } else {
             return this.linkupServers;
        }
    }
    
}

export { AccountDevicesInfo };