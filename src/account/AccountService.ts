import { Resources, Hash } from 'hyper-hyper-space';
import { AccountDevices } from './peers/AccountDevices';
import { SharedNamespace } from '../sync/SharedNamespace';
import { AccountDevicesInfo } from './shared/AccountDevicesInfo';

/* AccountsService: Creates a peer group amoung all the account devices,
                    uses it to sync the set of devices itself.

                    Other modules may use the syncSharedNamespace method to
                    have per-account shared and synchronized data.

 */


class AccountService {

    ownerIdentityHash: Hash;
    localDeviceHash?: Hash;

    resources?: Resources;

    accountDevices?: AccountDevices;

    started = false;

    constructor(ownerIdentityHash: Hash, localDeviceHash?: Hash) {
        this.ownerIdentityHash = ownerIdentityHash;
        this.localDeviceHash   = localDeviceHash;
    }

    async init(resources: Resources) {

        if (resources === undefined) {
            this.resources = resources;
            this.accountDevices = new AccountDevices(this.ownerIdentityHash, this.localDeviceHash);
            await this.accountDevices.init(resources);
            this.accountDevices.addSyncTarget(this.accountDevices.deviceInfo as AccountDevicesInfo);
        }
    }

    start() {

        if (this.resources === undefined) {
            throw new Error('AccountService needs to be initialized before start can be invoked.');
        }

        if (!this.started) {
            this.accountDevices?.connect();
            this.started = true;
        }
        
    }

    syncSharedNamespace(namespace: SharedNamespace) {

        if (this.resources === undefined) {
            throw new Error('AccountService needs to be initialized before syncSharedNamespace can be invoked.');
        }

        this.accountDevices?.addSyncTarget(namespace);
    }

}

export { AccountService };