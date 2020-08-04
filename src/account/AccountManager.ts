import { AccountDeviceSync } from './AccountDeviceSync';
import { AccountInfo } from './AccountInfo';

import { Identity, Hash, Resources, Store, IdbBackend, MutableObject } from 'hyper-hyper-space';
import { Mesh } from 'hyper-hyper-space';
import { Device } from './Device';

class AccountManager {

    accountInfo?: AccountInfo;
    sync?: AccountDeviceSync;

    resources?: Resources;

    async connectWithDevice(deviceHash: Hash, resources?: Partial<Resources>) {
        this.init(deviceHash, resources);

        let device = await this.resources?.store.load(deviceHash) as Device;
        
        this.accountInfo = new AccountInfo(device.getAuthor().hash());
        await this.accountInfo.init(this.resources);
        
        this.sync = new AccountDeviceSync(this.accountInfo);

        await this.sync.init(this.resources);

        this.sync.connect();
        this.sync.addAll(this.accountInfo.sharedMutables.getAll() as IterableIterator<MutableObject>);
    }

    async connectWithNewDevice(identity: Identity, resources?: Partial<Resources>) {
        let device = new Device(identity);

        this.init(device.hash(), resources);
        this.resources?.store.save(device);

        await this.connectWithDevice(device.hash(), resources);
    }

    private init(deviceHash: Hash, resources?: Partial<Resources>) {
        if (this.resources === undefined) {
            const idbName = 'hhs-home-device-' + deviceHash;
            this.resources = { 
                mesh: resources?.mesh === undefined? new Mesh() : resources.mesh,
                store: resources?.store === undefined? new Store(new IdbBackend(idbName)) : resources.store,
                config: resources?.config === undefined? {} : resources.config,
                aliasing: resources?.aliasing === undefined? new Map() : resources.aliasing  
            };
            this.resources.config.deviceHash = deviceHash;
        }
    }

}

export { AccountManager };