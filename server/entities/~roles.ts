/*

# AuthZ Overview:

A *User* is an account representing a person who can do some thing within the system.
A *Named Action* - is an action in the code, a base level primatives, POST {this resource}
A *Role* Is NAmed COllection of Named Actions
A *Group* is a synthetic container of users,
  The container itself is granted roles and Action Privleges.
  Users are granted access to various actions via their group membership.

RoleA:
           read   create  update  delete
Resource1  x      x       x       x
Resource2  x      x       x       x
Resource3  x      x
Resource4  x      x

1. Token Validation
2. Scope Checks
3. Claim Checks

What about in a cloud system of federated applications?
- Core -> Who Are you?
- Core -> Grants for X,Y,Z

{coreToken = cTok} --to-> App1
App1 -> App1Token(cTok) -> a1Tok(cTok)

What about macaroons?

*/
