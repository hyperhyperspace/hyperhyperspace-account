import { Resources } from 'hyper-hyper-space';
import { DevicesPeerGroup } from './peers/DevicesPeerGroup';
import { SharedNamespace } from '../sync/SharedNamespace';


class AccountService {

    resources?: Resources;

    devicesPeerGroup?: DevicesPeerGroup;

    async init(resources: Resources) {

        if (resources === undefined) {
            this.resources = resources;
            this.devicesPeerGroup = new DevicesPeerGroup();
            await this.devicesPeerGroup.init(resources);
            this.devicesPeerGroup.addSyncTarget(this.devicesPeerGroup.deviceInfo);
        }
    }

    start() {
        this.devicesPeerGroup.connect();
    }

    syncSharedNamespace(namespace: SharedNamespace) {
        this.devicesPeerGroup.addSyncTarget(namespace);
    }

}