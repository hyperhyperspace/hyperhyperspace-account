# The Hyper Hyper Space **Account** library  

## Intro

Use an HHS identity to create a personal cloud with a person's own devices.

Implement invite / accept invite logic to create a contact. Synchronize an account's contact list using its personal cloud.

Allow to sync HHS objects privately with each contact, creatign a cloud by mingling both account's devices.

This is WIP. This version prioritizes privacy over availability. Only personal or contcat-pair peer groups are formed. Shared __secret box__ style mailboxes could be used to provide better availability when someone has no online devices.

## Code

Each module has 3 submodules:

 - **model** the actual data model as it is layed out in the local store.
 - **peers** the peer groups that are needed for the sync, either loaded from the store or ad-hoc sources like invite tokens.
 - **sync** the sync logic: creates all the necessary peer groups and injects the objects that need to be synchronized over each one.

And there are currently 2 modules in the library:

 - **account** keeps track of an account devices, provides sync logic accross them.
 - **contacts** stores all your contacts, sent invites, received and accepted invite tokens (that should be sent out of band for the moment), and syncs data privately with each of your contacts.

 No direct networking is performed, everything (even the conenction invites) is saved to the local HHS stored and shipped over the mesh. Maybe this is a little extreme!

**Important**: This library references the [HHS core library](https://github.com/hyperhyperspace/hyperhyperspace-core), that is not still published to NPM. You need to check it out, build it and use 'yarn link'. 