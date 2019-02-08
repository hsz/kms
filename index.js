#!/usr/bin/env node

const AWS = require('aws-sdk');
const fs = require('fs');
const program = require('commander');
const manifest = require('./package');

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_KMS_KEY_ID,
  AWS_REGION,
  AWS_PROFILE
} = process.env;
const SECRET = 'secret:';

const Client = cmd => {
  const profile = cmd.profile || AWS_PROFILE;
  const accessKeyId = cmd.accessKeyId || AWS_ACCESS_KEY_ID;
  const secretAccessKey = cmd.secretAccessKey || AWS_SECRET_ACCESS_KEY;
  const region = cmd.region || AWS_REGION;
  const KeyId = cmd.keyId || AWS_KMS_KEY_ID;
  const credentials = new AWS.SharedIniFileCredentials({ profile });

  const client = new AWS.KMS(
    accessKeyId && secretAccessKey
      ? {
          accessKeyId,
          secretAccessKey,
          region
        }
      : { credentials, region }
  );

  return {
    decrypt: input =>
      client
        .decrypt({ CiphertextBlob: Buffer.from(input, 'base64') })
        .promise()
        .then(({ Plaintext }) => Plaintext.toString()),
    encrypt: Plaintext =>
      client
        .encrypt({ KeyId, Plaintext })
        .promise()
        .then(({ CiphertextBlob }) => CiphertextBlob.toString('base64'))
  };
};

program
  .version(manifest.version)
  .option('-r --region <region>', 'AWS Region - i.e. eu-west-1')
  .option('-p --profile <profile>', 'AWS profile name, ')
  .option('-k --keyId <keyId>', 'AWS KMS Key Id')
  .option('-i --accessKeyId <accessKeyId>', 'AWS Access Key Id')
  .option('-s --secretAccessKey <secretAccessKey>', 'AWS Secret Access Key');

program.command('decrypt <file>').action((file, cmd) =>
  new Promise((resolve, reject) =>
    fs.readFile(file, 'utf-8', (err, data) => (err ? reject(err) : resolve(data)))
  )
    .then(response =>
      response
        .trim()
        .split('\n')
        .map(line => line.split('='))
        .map(([key, value]) =>
          value.startsWith(SECRET)
            ? Client(cmd.parent)
                .decrypt(value.substr(SECRET.length))
                .then(decrypted => [key, decrypted])
            : [key, value]
        )
    )
    .then(response => Promise.all(response))
    .then(pairs => pairs.map(pair => pair.join('=')).join('\n'))
    .then(console.log)
);

program
  .command('add <file> <content>')
  .description('Adds new line to the file encrypting the value')
  .action((file, content, cmd) => {
    const [key, value] = content.split('=');
    return Client(cmd.parent)
      .encrypt(value.join('='))
      .then(
        encrypted =>
          new Promise((resolve, reject) =>
            fs.appendFile(file, `\n${key}=${SECRET}${encrypted}`, (err, data) =>
              err ? reject(err) : resolve(data)
            )
          )
      );
  });

program
  .command('encrypt <value>')
  .description('Encrypts provided value')
  .action((value, cmd) =>
    Client(cmd.parent)
      .encrypt(value)
      .then(console.log)
  );

program.parse(process.argv);
