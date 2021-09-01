| Entity Type               | pk                  | sk                         | value | interfaceName |
|---------------------------|---------------------|----------------------------|-------|---------------|
| Link                      | l#{{short}}         | l#{{short}}                |
| User                      | u#{{uacct}}         | u#{{uacct}}                | 
| Click                     | c#{{short}}         | tks#{{ksuid.now().string}} | 
| Link Click Count By Min   | lcByMin#{{short}}   | t#{{dateBucketStr}}        |
| Link Click Count By Tmb   | lcByTmb#{{short}}   | t#{{dateBucketStr}}        |
| Link Click Count By Hour  | lcByHr#{{short}}    | t#{{dateBucketStr}}        |
| Link Click Count By Day   | lcByDay#{{short}}   | t#{{dateBucketStr}}        |
| Link Click Count By Month | lcByMonth#{{short}} | t#{{dateBucketStr}}        |
| Link Click Count By Year  | lcByYear#{{short}}  | t#{{dateBucketStr}}        |
