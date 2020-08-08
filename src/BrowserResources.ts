import { Resources, Store, IdbBackend, Mesh, Hash, Identity } from 'hyper-hyper-space';
import { Device } from './account/Device';


class BrowserResources {

    async createDevice(identity: Identity): Promise<Hash> {
        let device = new Device(identity);
        let deviceHash = device.hash();
        let store = BrowserResources.storeForDevice(deviceHash);
        await store.save(device);
        return deviceHash;
    }

    async initForDevice(deviceHash: Hash) : Promise<Resources> {

        let resources = {
            store: BrowserResources.storeForDevice(deviceHash),
            mesh:  new Mesh(),
            config: { deviceHash: deviceHash } as any,
            aliasing: new Map()
        };

        let device = await resources.store.load(deviceHash);

        if (device !== undefined) {
            resources.config.device = device;
            resources.config.identity = device.getAuthor();
        } else {
            throw new Error('Device ' + deviceHash + ' is missing in this browser local store');
        }

        resources.store.setResources(resources);

        return resources;
    }

    private static storeForDevice(deviceHash: Hash) : Store {
        return new Store(new IdbBackend('device-' + deviceHash));
    }
}