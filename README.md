# emoore
> link lanks for the people

[![Build + Test Badge][github-action-badge]][github-action-url]

### Documentation
[Tutorials](https://github.com/ericdmoore/emoore/wiki/Tutorials) | [Concepts](https://github.com/ericdmoore/emoore/wiki/Concepts) | [How To Guides](https://github.com/ericdmoore/emoore/wiki/Guides) | [Reference](https://github.com/ericdmoore/emoore/wiki/Documentation)


## What is it?

- an executable and embeddable cloud `liBin` (aka: lib + bin)
- Executable API + Schema For Upstream consumtion

## What Problem Does it Solve?

For the stingy jerks out there that dont want to run a DB that charges us by the second, but rather by compute and storage, think of this a stingy man's replacement of `YOURLS` or `bit.ly`

## Why Use This Project?

- Because You are stingy?
- Because You just want to get started by to clicking a few buttons and install a cloud application to AWS?
- and maybe other reasons?

## Installation (official name is TBD)

`npm i ??? -S`

## Supported Use Cases

1. Expanding a Regular Short Link - (the bitly use case)
2. Raffle Use Cases - (a link that changes based on the number of clicks)
3. GDPR Workaround Use Cases - ( a link that changes based on the geography-code from where its clicked)
4. Expiring Links - (a link that changes as it grows old and ages past the datetimes you set up)
5. A Very Fancy Link - (compose an ensemble using a mixture of all the above)

## Roadmap

- API Events for links on `/links`
- API for Registered Queries on `/stats`
- Better ACLs
- Benchmark the performance of each commit

<!-- Link References -->
[github-action-badge]:https://github.com/ericdmoore/emoore/actions/workflows/nodejs.yml/badge.svg
[github-action-url]:https://github.com/ericdmoore/emoore/actions/workflows/nodejs.yml
