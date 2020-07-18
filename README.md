This the Hyper Hyper Space **Home** library.

It is meant both as a proof of concept for HHS, and as a set of basic constructs for user interaction. It works fully p2p inside a web browser, using IndexedDB for local storage and WebRTC for comms.

It is work in progress, its first version will include:

* Account management: allows a user to use his identity and sync his data across a set of devices.
* An AddressBook: add other Home Accounts as contacts securely.
* Chat/Video/Voice: Interact with contacts from your address book.

**Important**: This library references the [HHS core library](https://github.com/hyperhyperspace/hyperhyperspace-core), that is not still published to NPM. You need to check it out, build it and use 'yarn link'. 