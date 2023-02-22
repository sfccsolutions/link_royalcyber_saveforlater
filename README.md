# Save for Later  (SFRA)

This is a repository for the Save for Later list catridge based on SFRA. The cartridge (`int_royalcyber_saveforlater`) is developed to manage out of stock products added to a customer’s cart. 
It saves out of stock products in a separate list also shown on the cart page so customers can proceed with checkout without the out-of-stock products. 
It also allows customers to order partial cart by saving products other than the desired ones manually.

This saveforlater cartridge (`int_royalcyber_saveforlater`) depends on the lib\_productlist cartridge.

# Cartridge Path Considerations
The saveforlater cartridge (`int_royalcyber_saveforlater`) requires the lib\_productlist cartridge and the app\_storefront\_base cartridge. In your cartridge path, include the cartridges in the following order:

```
int_royalcyber_saveforlater:lib_productlist:app_storefront_base
```

# The latest version

The latest version of SFRA is 6.0.0

# Getting Started

1. Clone this repository.

2. In the top-level folder, edit the paths.base property in the package.json file. This property should contain a relative path to the local directory containing the Storefront Reference Architecture repository. For example:
```
"paths": {
    "base": "../storefront-reference-architecture/cartridges/app_storefront_base/"
  }
```
3. In the top-level folder, enter the following command: `npm run compile:js && npm run compile:scss`

4. Create `dw.json` file in the root of the project:
```json
{
    "hostname": "your-sandbox-hostname.demandware.net",
    "username": "yourlogin",
    "password": "yourpwd",
    "code-version": "version_to_upload_to"
}
```

5. Run `npm run uploadCartridge`. It will upload `int_royalcyber_saveforlater`, and `lib_productlist` cartridges to the sandbox you specified in `dw.json` file.

6. You should now be ready to navigate to and use your site.

# NPM scripts
Use the provided NPM scripts to compile and upload changes to your Sandbox.

## Compiling your application

* `npm run compile:scss` - Compiles all .scss files into CSS.
* `npm run compile:js` - Compiles all .js files and aggregates them.
* `npm run compile:fonts` - Copies all needed font files. Usually, this only has to be run once.

 If you are having an issue compiling scss files, try running 'npm rebuild node-sass' from within your local repo.

## Linting your code

`npm run lint` - Execute linting for all JavaScript and SCSS files in the project. You should run this command before committing your code.

## Watching for changes and uploading

`npm run watch` - Watches everything and recompiles (if necessary) and uploads to the sandbox. Requires a valid `dw.json` file at the root that is configured for the sandbox to upload.

## Uploading

`npm run uploadCartridge` - Will upload `app_storefront_base`, `modules` and `bm_app_storefront_base` to the server. Requires a valid `dw.json` file at the root that is configured for the sandbox to upload.

`npm run upload <filepath>` - Will upload a given file to the server. Requires a valid `dw.json` file.

# Testing
## Running unit tests

You can run `npm test` to execute all unit tests in the project. Run `npm run cover` to get coverage information. Coverage will be available in `coverage` folder under root directory.

* UNIT test code coverage:
1. Open a terminal and navigate to the root directory of the mfsg repository.
2. Enter the command: `npm run cover`.
3. Examine the report that is generated. For example: `Writing coverage reports at [/Users/yourusername/SCC/sfra/coverage]`
3. Navigate to this directory on your local machine, open up the index.html file. This file contains a detailed report.

## Running integration tests
Integration tests are located in the `storefront-reference-architecture/test/integration` directory.

To run integration tests you can use the following command:

```
npm run test:integration
```

**Note:** Please note that short form of this command will try to locate URL of your sandbox by reading `dw.json` file in the root directory of your project. If you don't have `dw.json` file, integration tests will fail.
sample `dw.json` file (this file needs to be in the root of your project)
{
    "hostname": "devxx-sitegenesis-dw.demandware.net"
}

You can also supply URL of the sandbox on the command line:

```
npm run test:integration -- --baseUrl devxx-sitegenesis-dw.demandware.net
```

# [Contributing to SFRA](./CONTRIBUTING.md)

#Page Designer Components for Storefront Reference Architecture
See: [Page Designer Components](./page-designer-components.md)
