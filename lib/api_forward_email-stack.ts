import * as cdk from '@aws-cdk/core';
import * as lambda from "@aws-cdk/aws-lambda";
import * as sns from "@aws-cdk/aws-sns";
import * as subscriptions from '@aws-cdk/aws-sns-subscriptions';
import * as api from "@aws-cdk/aws-apigateway";
import * as s3 from "@aws-cdk/aws-s3";

export class ApiForwardEmailStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const emailBucket = new s3.Bucket(this, "EmailBucket", {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      publicReadAccess: false
    });

    const emailTopic = new sns.Topic(this, 'EmailTopic');
    emailTopic.addSubscription(new subscriptions.EmailSubscription('alex991nguyen@gmail.com'));

    const apiGatewayToLambda = new ApiGatewayToLambda(this, "ApiGateway", {
      prefix: "ApiGateway",
      apiGatewayDescription: "The API gateway that forwards to a Lambda",
      lambdaAssetCode: new lambda.AssetCode("lib/lambda"),
      lambdaHandler: "forward.handler",
      lambdaEnvironment: {
        "BUCKET_NAME": emailBucket.bucketName,
        "TOPIC_ARN": emailTopic.topicArn,
      }
    });
    if (!apiGatewayToLambda.lambda.role) {
      // this should not happen because a role is created by default
      throw new Error("Role is missing from the Lambda")
    }
    emailTopic.grantPublish(apiGatewayToLambda.lambda.role);
    emailBucket.grantPut(apiGatewayToLambda.lambda.role);

  }
}

export interface ApiGatewayToLambdaProps {
  readonly prefix: string;
  readonly apiGatewayDescription: string;
  readonly lambdaAssetCode: lambda.AssetCode;
  readonly lambdaHandler: string;
  readonly lambdaEnvironment?: {[key: string]: string;}
  readonly allowOrigins?: string;
  readonly reservedConcurrentExecutions?: number;
}

export class ApiGatewayToLambda extends cdk.Construct {
  public readonly lambda: lambda.Function;
  public readonly apiGateway: api.LambdaRestApi;

  constructor(scope: cdk.Construct, id: string, props: ApiGatewayToLambdaProps) {
    super(scope, id);

    const methodResponse: api.MethodResponse = {
      statusCode: "200",
      responseParameters: {
        "method.response.header.Access-Control-Allow-Headers": true,
        "method.response.header.Access-Control-Allow-Methods": true,
        "method.response.header.Access-Control-Allow-Credentials": true,
        "method.response.header.Access-Control-Allow-Origin": true,
      },
    };

    const defaultCorsOptions: api.CorsOptions = {
      allowCredentials: true,
      allowMethods: ["POST", "OPTIONS"],
      statusCode: 200,
      allowOrigins: [props.allowOrigins ?? "*"],
    };

    this.lambda = new lambda.Function(this, `${props.prefix}Lambda`, {
      code: props.lambdaAssetCode,
      handler: props.lambdaHandler,
      runtime: lambda.Runtime.PYTHON_3_8,
      timeout: cdk.Duration.seconds(30),
      reservedConcurrentExecutions: props.reservedConcurrentExecutions ?? 1,
      environment: props.lambdaEnvironment
    });
  
    this.apiGateway = new api.LambdaRestApi(this, `${props.prefix}ApiGateway`, {
      proxy: true,
      handler: this.lambda,
      defaultMethodOptions: {
        // default already none. just making this explicit
        // to call out the preflight call needs 'NONE' auth
        authorizationType: api.AuthorizationType.NONE,
        methodResponses: [methodResponse],
      },
      description: props.apiGatewayDescription,
      defaultCorsPreflightOptions: defaultCorsOptions,
    });

    const usagePlan = this.apiGateway.addUsagePlan('UsagePlan', {
      name: 'ThrottleUsagePlan',
      throttle: {
        rateLimit: 10,
        burstLimit: 2,
      },
      quota: {
        period: api.Period.DAY,
        limit: 100,
      }
    });

  }
}