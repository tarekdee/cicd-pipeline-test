# Static Site Hosting Pulumi Stack

## Overview  
This Pulumi stack deploys a **Static Site Hosting** solution using **Amazon S3 and CloudFront**.  
It provisions all necessary resources, including domain registration, DNS record updates, and origin access policies.  

## Prerequisites  
Before deploying this stack, ensure you have:  
- Completed the [Pulumi Foundational Training](https://github.com/pulumi/foundational-training).  
- Installed [Pulumi CLI](https://www.pulumi.com/docs/install/).  
- Configured AWS credentials.  

## Configuration  
The stack requires the following configuration values:  

| Parameter         | Description | Default |
|------------------|------------|---------|
| `domainName` | Enter the domain that your application will be served on, a subdomain of the 'rootDomainName'. | `pulumi-test.sandbox.aetnd.io` |
| `rootDomainName` | Enter the main domain under which subdomains (like 'domainName') are managed. | `sandbox.aetnd.io` | 
| `hostedZoneId` | Enter hosted zone ID where the root domain resides. | `ZN8QCP9TVT9UQ` | 
| `applicationID` | Enter your applicationn ID. | `template-static-app` |
| `environment` | Select environment from the following: POC, DEV, QAT, UAT, STG, DBG, PRD, DRE, DV1, DV2, DV3, QA1, QA2, QA3, TRN. | `DEV` |
| `accountNumber` | Enter the AWS account number where the stack will be deployed. | `321543719502` |
| `region` | Enter AWS region. | `us-east-1` |

## Deployment  
To deploy the stack:  

```sh
pulumi stack init <stack-name>
pulumi up
```

Outputs
Once deployed, Pulumi will return:

```
Site URL  
Bucket Name  
CloudFront Domain 
Cleanup
```

To remove the deployment:

```
pulumi destroy
pulumi stack rm <stack-name>
```