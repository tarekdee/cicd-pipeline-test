import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface StaticSiteArgs {
    domainName: string;
    rootDomainName: string;
    hostedZoneId: string;
    applicationID: string;
    environment: string;
    env_prefix: { [key: string]: string };
}

export class StaticSite extends pulumi.ComponentResource {
    public readonly siteUrl: pulumi.Output<string>;
    public readonly bucketName: pulumi.Output<string>;
    public readonly cloudFrontDomain: pulumi.Output<string>;

    constructor(name: string, args: StaticSiteArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:resource:StaticSite", name, {}, opts);

        const { domainName, rootDomainName, hostedZoneId, applicationID, environment, env_prefix } = args;

        const certificate = new aws.acm.Certificate(`${environment}-${applicationID}-certificate`, {
            domainName: `*.${rootDomainName}`,
            validationMethod: "DNS",
        }, { 
            parent: this,
        });

        const certificateValidation = new aws.acm.CertificateValidation(`${environment}-${applicationID}-certValidation`, {
            certificateArn: certificate.arn,
            validationRecordFqdns: []
        }, { parent: this });

        const bucketName = `${environment.toLowerCase()}-s3www-${env_prefix[environment].toLowerCase()}${applicationID.toLowerCase()}`;

        const siteBucket = new aws.s3.Bucket(applicationID, {
            bucket: bucketName,
            acl: "private",
            versioning: { enabled: true },
            lifecycleRules: [{
                id: "intelligent-tiering-rule",
                enabled: environment === "DRE" || environment === "PRD" ? false : true,
                transitions: [{
                    days: 30,
                    storageClass: "INTELLIGENT_TIERING",
                }],
                noncurrentVersionTransitions: [{
                    days: 30,
                    storageClass: "INTELLIGENT_TIERING",
                }],
                expiration: {
                    expiredObjectDeleteMarker: true,
                },
                noncurrentVersionExpiration: {
                    days: 60,
                },
                abortIncompleteMultipartUploadDays: 7,
            }],
            website: {
                indexDocument: "index.html",
                errorDocument: "error.html",
            },
            forceDestroy: true,
            tags: {
                Name: bucketName,
                Environment: environment,
            }
        }, { parent: this });

        const oac = new aws.cloudfront.OriginAccessControl(`${environment}-${applicationID}-oac`, {
            name: `${environment}-${applicationID}-s3-oac`,
            originAccessControlOriginType: "s3",
            signingBehavior: "always",
            signingProtocol: "sigv4",
        }, { parent: this });      

        const siteBucketOwnershipControls = new aws.s3.BucketOwnershipControls(`${applicationID}-ownership`, {
            bucket: siteBucket.id,
            rule: { objectOwnership: "BucketOwnerEnforced" },
        }, { parent: this });

        const siteBucketPublicAccessBlock = new aws.s3.BucketPublicAccessBlock(`${applicationID}-public-access-block`, {
            bucket: siteBucket.id,
            blockPublicAcls: true,
            blockPublicPolicy: true,
            ignorePublicAcls: true,
            restrictPublicBuckets: true,
        }, { parent: this });

        const siteBucketCORS = new aws.s3.BucketCorsConfigurationV2(`${applicationID}-cors`, {
            bucket: siteBucket.id,
            corsRules: [{
                allowedHeaders: ["*"],
                allowedMethods: ["POST", "PUT", "DELETE", "GET"],
                allowedOrigins: ["*"],
                maxAgeSeconds: 0
            }],
        }, { parent: this });

        const distribution = new aws.cloudfront.Distribution(`${environment}-${applicationID}-cloudfront`, {
            defaultRootObject: "index.html",
            enabled: true,
            origins: [{
                domainName: siteBucket.bucketRegionalDomainName,
                originId: siteBucket.arn,
                originAccessControlId: oac.id,
            }],
            isIpv6Enabled: true,
            customErrorResponses: [{
                errorCode: 403,
                responseCode: 200,
                responsePagePath: "/error.html",
            }],
            comment: `${environment.toLowerCase()}-s3www-${env_prefix[environment].toLowerCase()}${applicationID.toLowerCase()}.s3.amazonaws.com`,
            aliases: [domainName],
            defaultCacheBehavior: {
                viewerProtocolPolicy: "redirect-to-https",
                allowedMethods: ["GET", "HEAD"],
                cachedMethods: ["GET", "HEAD"],
                targetOriginId: siteBucket.arn,
                forwardedValues: { queryString: false, cookies: { forward: "none" } },
            },
            priceClass: "PriceClass_100",
            viewerCertificate: {
                acmCertificateArn: certificate.arn,
                sslSupportMethod: "sni-only",
            },
            restrictions: {
                geoRestriction: { restrictionType: "none" },
            },
        }, { parent: this });

        const bucketPolicy = new aws.s3.BucketPolicy(`${environment}-${applicationID}-bucket-policy`, {
            bucket: siteBucket.id,
            policy: pulumi.all([siteBucket.arn, distribution.arn]).apply(([bucketArn, cloudfrontArn]) =>
                JSON.stringify({
                    Version: "2012-10-17",
                    Statement: [{
                        Effect: "Allow",
                        Action: "s3:GetObject",
                        Principal: { Service: "cloudfront.amazonaws.com" },
                        Resource: `${bucketArn}/*`,
                        Condition: {
                            StringEquals: {
                                "AWS:SourceArn": cloudfrontArn
                            }
                        }
                    }],
                })
            ),
        }, { parent: this });  

        const dnsRecord = new aws.route53.Record(`${environment}-${applicationID}-record`, {
            zoneId: hostedZoneId,
            name: domainName,
            type: "A",
            aliases: [{
                name: distribution.domainName,
                zoneId: distribution.hostedZoneId,
                evaluateTargetHealth: false,
            }]
        }, { parent: this });

        this.siteUrl = pulumi.interpolate`https://${domainName}`;
        this.bucketName = siteBucket.id;
        this.cloudFrontDomain = distribution.domainName;

        this.registerOutputs({
            siteUrl: this.siteUrl,
            bucketName: this.bucketName,
            cloudFrontDomain: this.cloudFrontDomain,
        });
    }
}
