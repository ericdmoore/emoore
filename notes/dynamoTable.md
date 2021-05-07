# Assumptions

1. Multi User? Sure, why not.
1. Saves a Long links
1. Associates  ShortURL -> LongURL
1. Count number of times Redirect happens (Click History)

*BASE = `pk` / `sk`* 

## links:
- `pk: l#{{ shorturl }} || sk: l#{{ shorturl }} -> [ longURL ]`
- used in hot path & resolves for everyone

            https://{{domain}}/short -> LONGURL

- but there can be riffs on that like:
    - might check for cookies or HTTP headers to perform authn + authz

            https://d.{{domain}}/short -> [ data/api response ]
            https://r.{{domain}}/short -> [ reporting page ]
            
## users:

- `pk: #u:{{ userID }} || sk: #u:{{ userID }} -> [ UserAccount]`
- Use Cases:
    - See my links
    - See which link has the most clicks
        - All Time
        - Last 14
        - Last 30
        - "Whadya Do For Me Lately" *WDFML* links = Score Decays Over Time.
            - Score Weights Recent Clicks
            - 
        - High Energy Links = Total Link Counts + Acceleration Weighted towards now
        - HN Score = (votes -1)^0.8 / (link ageHrs + 2)^1.8 [ref](http://www.righto.com/2013/11/how-hacker-news-ranking-really-works.html)
        - perhaps translates to `given shortLink, forAll clicks ∑ (click(i)/ageHrs(i))^1/2 `
        - Ref [Poisson Dist](https://en.wikipedia.org/wiki/Poisson_distribution) - 


## clicks

- `pk: #click:{{LONG URL}} || sk: {{ tstamp }} -> [ clickRecord ]`

## clickBuckets

- `pk: #clickBucketMinutes:{{LONG URL}} || sk: {{ YYYY-MM-DD-HH }} -> [ clickBucket Record ]`
- `pk: #clickBucketHours:{{LONG URL}}   || sk: {{ YYYY-MM-DD-HH }} -> [ clickBucket Record ] `
- `pk: #clickBucketDays:{{LONG URL}}    || sk: {{ YYYY-MM-DD-HH }} -> [ clickBucket Record ] `
- `pk: #clickBucketMonth:{{LONG URL}}   || sk: {{ YYYY-MM-DD-HH }} -> [ clickBucket Record ] `
- `pk: #clickBucketYear:{{LONG URL}}    || sk: {{ YYYY-MM-DD-HH }} -> [ clickBucket Record ] `


## usserAccess

- `pk: #clickBucketMinutes:{{LONG URL}} || sk: {{ YYYY-MM-DD-HH }} -> [ clickBucket Record ]`
- `pk: #clickBucketHours:{{LONG URL}}   || sk: {{ YYYY-MM-DD-HH }} -> [ clickBucket Record ] `
- `pk: #clickBucketDays:{{LONG URL}}    || sk: {{ YYYY-MM-DD-HH }} -> [ clickBucket Record ] `
- `pk: #clickBucketMonth:{{LONG URL}}   || sk: {{ YYYY-MM-DD-HH }} -> [ clickBucket Record ] `
- `pk: #clickBucketYear:{{LONG URL}}    || sk: {{ YYYY-MM-DD-HH }} -> [ clickBucket Record ] `






## Evolving Links

- Links that change based on time, clicks, events, geo
- Use Case:
- Raffle: 
    - Paste A Link
    - First N clicks get X, 
    - The next M get Y
    - Then the link says `Try Again`
    effectivly a re-write rule - @Nth click, and then a new rule @Mth click

- Vending Link
    - rewrite rule runs on every click
    - Everytime you click it, a new/uniq JWT is appended to the long link