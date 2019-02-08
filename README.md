# kms

AWS KMS encrypt/decrypt NodeJS executable for handling .env files.


## General purpose

When working on a project which is shared among the developers team or having a couple of
environments (i.e. testing, staging, production) or any other scenario that may require
sharing and versioning the secret keys used by this project - it is always a hard moment to pick
the right tools and workflow to solve this problem of storing vulnerable access keys.

This simple package utilizes 
