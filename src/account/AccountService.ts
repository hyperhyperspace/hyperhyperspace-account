import { Resources, Hash } from 'hyper-hyper-space';
import { AccountDevices } from './peers/AccountDevices';
import { SharedNamespace } from '../sync/SharedNamespace';
import { PeerGroup } from '../sync/PeerGroup';

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
            this.accountDevices.addSyncTarget(this.accountDevices.deviceInfo);
        }
    }

    start() {

        if (!this.started) {
            this.accountDevices.connect();
            this.started = true;
        }
        
    }

    syncSharedNamespace(namespace: SharedNamespace) {
        this.accountDevices.addSyncTarget(namespace);
    }

}

export { AccountService };