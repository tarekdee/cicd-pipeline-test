import * as pulumi from "@pulumi/pulumi";
import { StaticSite } from './component';

const config = new pulumi.Config();
const domainName = config.require("domainName");
const rootDomainName = config.require("rootDomainName");
const hostedZoneId = config.require("hostedZoneId");
const applicationID = config.require("applicationID");
const environment = config.require("environment");

const env_prefix = {
  DEV: "D",
  QAT: "Q",
  UAT: "U",
  DBG: "B",
  STG: "S",
  PRD: "P",
  DRE: "R",
}

const staticSite = new StaticSite(applicationID, {
  domainName: domainName,
  rootDomainName: rootDomainName,
  hostedZoneId: hostedZoneId,
  applicationID: applicationID,
  environment: environment,
  env_prefix: env_prefix
});

export const siteUrl = staticSite.siteUrl;
export const bucketName = staticSite.bucketName;
export const cloudFrontDomain = staticSite.cloudFrontDomain;
