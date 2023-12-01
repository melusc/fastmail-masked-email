# fastmail-masked-email

## Installation

```bash
npm install @lusc/fastmail-masked-email
#or
yarn add @lusc/fastmail-masked-email
```

## Example

```ts
// JMAP_TOKEN is set

import {MaskedEmail} from '@lusc/fastmail-masked-email';

const me = await MaskedEmail.create({
  description: 'Avoid spam from $retailer',
});

console.log(me.email);

// ...

// User doesn't need email address anymore
await me.disable();
```

## Setting Up Authentication

To make requests, you need to generate an API token for Fastmail. You can read how to do so in their [Help Center](https://www.fastmail.help/hc/en-us/articles/5254602856719-API-tokens). The token must be created with the `Masked Email` scope.

The token can be passed using the env `JMAP_TOKEN` or as a string directly to `getSession`.

You can also set `JMAP_HOSTNAME` to override the fastmail host. The default is `api.fastmail.com`

## Usage

### Getting a Session

For authentication, `getSession` is used.
The function returns an object, that then can be used for making requests.
This is optional if `JMAP_TOKEN` is set.

```ts
declare function getSession(
  apiToken?: string,
  hostname?: string,
): Promise<Session>;

import {getSession} from '@lusc/fastmail-masked-email';

// Pass token and hostname explicitly
let session = await getSession(token, hostname);

// Uses `JMAP_TOKEN`, and if present, `JMAP_HOSTNAME`
session = await getSession();
```

## MaskedEmail

```ts
declare class MaskedEmail {
  email: string;
  id: string;
  createdAt: Date;
  createdBy: string;
  lastMessageAt: Date | undefined;
  url: string | undefined;
  forDomain: string;
  description: string;
  state: 'enabled' | 'disabled' | 'pending' | 'deleted';

  // static methods and methods are enumerated below
}
```

### MaskedEmail.create

This is used to create a masked email. By default the state is set to `enabled`.

```ts
type CreateOptions = {
  // Describe what the email is for
  description?: string;
  // What domain the email is used on
  forDomain?: string;
  // enabled - Address accepts emails
  // disabled - Emails are sent to trash
  // deleted - Emails are bounced back
  // pending - Will be deleted after 24h, or if email is received, set to enabled
  state?: 'enabled' | 'disabled' | 'pending' | 'deleted';
  // email will be `${emailPrefix}.${random}@domain` if set
  emailPrefix?: string;
};

declare function create(
  options?: CreateOptions,
  session?: Session,
): Promise<MaskedEmail>;

await MaskedEmail.create({
  description: 'A descriptive description',
});
```

### MaskedEmail.findById

Each masked email has an id.
This method can be used to get a `MaskedEmail` instance for the corresponding masked email.
It throws, if no email address with the id exists.

```ts
declare function findById(id: string, session?: Session): Promise<MaskedEmail>;

await MaskedEmail.findById('masked-1234567');
```

### MaskedEmail.findByEmail

This is similar to `MaskedEmail.findById`, but it uses the email address instead.
It throws, if the email address does not exist.

```ts
declare function findByEmail(
  emailAddress: string,
  session?: Session,
): Promise<MaskedEmail>;

await MaskedEmail.findByEmail('quick.tent2830@fastmail.com');
```

### MaskedEmail.getAllEmails

Get all email addresses, also those in trash.
If `ids` is set, it returns only the corresponding email addresses.
It throws if any of the `ids` don't exist.

```ts
declare function getAllEmails(
  ids?: string[],
  session?: Session,
): Promise<MaskedEmail[]>;

const addresses = await MaskedEmail.getAllEmails();
for (const address of addresses) {
  address.disable();
}
```

### MaskedEmail#update

Modify the description, `forDomain`, or the state of a masked email.
It returns `this` and updates the details. So if description is modified, `MaskedEmail#description` will reflect the new description.

```ts
type Options = {
  description?: string;
  forDomain?: string;
  state?: 'enabled' | 'disabled' | 'pending' | 'deleted';
};

declare function update(options: Options): Promise<MaskedEmail>;

const me = await MaskedEmail.create();
// I forgot to add a description, so lets do that
await me.update({
  description: '$description',
});
```

### MaskedEmail#delete

Set `state` to `deleted`.

```ts
declare function delete(): Promise<MaskedEmail>;

const me = await MaskedEmail.create();
// I don't need it anymore
await me.delete();
```

### MaskedEmail#disable

Set `state` to `disabled`.

```ts
declare function disable(): Promise<MaskedEmail>;

const me = await MaskedEmail.create();
// I don't need it right now, but I might need it soon
await me.disable();
```

### MaskedEmail#enable

Set `state` to `enabled`.

```ts
declare function enable(): Promise<MaskedEmail>;

const me = await MaskedEmail.findById('masked-9876543');
// I need it again now
await me.enable();
```

### MaskedEmail#permanentlyDelete

In contrast to `MaskedEmail#delete`, this is cannot be reversed.
The email address will be permanently deleted and cannot be recovered.

This is only possible for addresses that have never received an email.
It will throw, if the address has ever received an email.

```ts
declare function permanentlyDelete(): Promise<MaskedEmail>;

const me = await MaskedEmail.create();
// Actually, I don't need the email address
await me.permanentlyDelete();
```
