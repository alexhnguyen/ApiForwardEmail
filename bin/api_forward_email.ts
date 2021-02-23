#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ApiForwardEmailStack } from '../lib/api_forward_email-stack';

const app = new cdk.App();
new ApiForwardEmailStack(app, 'ApiForwardEmailStack');
