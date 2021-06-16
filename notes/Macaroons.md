Macaroons
===============


Macaroons are a way to delegate authZ control.

- Where users can choose to let someone perform some or all of their actions.
- A service will only grant access iff everything is: understood, verifiable, and truthy


```
server side
0. Hash(sec, Id, location)-> sig0 
----------------
user side
1. Hash( sig0, ID, location) -> sig1
2. Hash( sig0, ID, location) -> sig1
```

1. is an hmac path dependent - yes but just like a string is path dependent.
A + B + C = ABC is different than C+A+B = CAB


Infra -Maca1 - to Forum
Forum adds Caveat to Maca1 making Maca2 
Dev wants interface with Forum


Enables Shared Resources across domains

- friends brings proof

Proof Trees
    Compose conditional Validation


[issuerA :: 'key1:value;key2:value'] = RollingSignature1
[issuerA :: 'key1:value', 'key2:value'] = RollingSignature1
['key2:value', 'key1:value'] = RollingSignature2

RollingSignature1 !== RollingSignature2

Mint a "Caveat Key" = 

E(Kn -> Kc) encryption envelope to give kc -> kc starts a new chain for 3rd party proofs

"Ec env": ecv

How to Represent a side chain

 
HMAC(pkGoog + kc)


## 3rd Party Caveats

uses PuKI from services

PuKI + 3rd Party Proof Required


3rd Party Example

assert( ecv: kC === side:k0)

[ecv: AES(k2).update(kC).digest('hex') ; side: k0: pki(pkGoo).update(kC).digest('hex') user:catLovr)]

verify Token - requries Action -> goto Google.com -> gets chain back... with addtitions... where they might add shared vocabulary condition.

orgination service - does not check side chain header
extact kC (using k2) -> verify proof response


## Vocabulary

// willy-nilly additions invalidate the whole chain
using repeat keys will usually invalidate.

Sometimes values compose:
availableOn: Tuesdays
+ 
availableOn: Janurary
=
Tuesdays in Jan

keys that are IDs (not sets) will leave no venn diagram remaining if there are duplicative keys. Again, usually repeat keys invalidate a chain. Like saying access is available to people prooving they are both.
user:1
user:2

aka: two people at once - aka: invalidated

================

keyID: string // u2F key?
ip: string // 
refreshable: number // how many times can it be soft refreshed
expiresIn: number // in miliseconds


a minimal service needs:
- a set of generated keys + keyID
- a public key resource, coordinating privKey
- ability to read other service vocab
- a public list of approved vocab terms
- interface(s)

Natural Needed 3rd Party Services
- Time-service
- Membership-services
    - User-Membership Services

issuerA # kid:SomeID;
key1:value;key2:value
key1:value;key2:value

header.payload.sig
