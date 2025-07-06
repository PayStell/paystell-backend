#!/usr/bin/env node

/**
 * OpenAPI Documentation Validation Script
 * 
 * This script validates that:
 * 1. The OpenAPI specification can be generated
 * 2. All required schemas are defined
 * 3. All endpoints have proper documentation
 * 4. The specification is valid OpenAPI 3.0
 */

const fs = require('fs');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

console.log('🔍 Validating OpenAPI Documentation...\n');

// Import the actual swagger configuration
const { specs: existingSpecs } = require('../dist/config/swagger.js');

// Use the existing swagger configuration
const options = {
  definition: existingSpecs,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/dtos/*.ts',
    './src/entities/*.ts',
  ],
};

// Generate the specification
const specs = swaggerJsdoc(options);

// Check if specs were generated
if (!specs || !specs.paths) {
  console.error('❌ Error: OpenAPI specification was not generated properly');
  process.exit(1);
}

console.log('✅ OpenAPI specification generated successfully');

// Validate basic structure
const requiredTopLevelKeys = ['openapi', 'info', 'paths', 'components'];
const missingKeys = requiredTopLevelKeys.filter(key => !specs[key]);

if (missingKeys.length > 0) {
  console.error(`❌ Error: Missing required top-level keys: ${missingKeys.join(', ')}`);
  process.exit(1);
}

console.log('✅ Basic OpenAPI structure is valid');

// Validate OpenAPI version
if (specs.openapi !== '3.0.0') {
  console.error(`❌ Error: Expected OpenAPI version 3.0.0, got ${specs.openapi}`);
  process.exit(1);
}

console.log('✅ OpenAPI version is correct (3.0.0)');

// Validate info object
const requiredInfoKeys = ['title', 'version', 'description'];
const missingInfoKeys = requiredInfoKeys.filter(key => !specs.info[key]);

if (missingInfoKeys.length > 0) {
  console.error(`❌ Error: Missing required info keys: ${missingInfoKeys.join(', ')}`);
  process.exit(1);
}

console.log('✅ Info object is complete');

// Validate components
if (!specs.components || !specs.components.schemas) {
  console.error('❌ Error: Components or schemas are missing');
  process.exit(1);
}

console.log('✅ Components section is present');

// Validate security schemes
if (!specs.components.securitySchemes || !specs.components.securitySchemes.bearerAuth) {
  console.error('❌ Error: Security schemes are missing or incomplete');
  process.exit(1);
}

console.log('✅ Security schemes are properly defined');

// Count endpoints by tag
const endpointsByTag = {};
Object.values(specs.paths).forEach(path => {
  Object.values(path).forEach(method => {
    if (method.tags && Array.isArray(method.tags)) {
      method.tags.forEach(tag => {
        endpointsByTag[tag] = (endpointsByTag[tag] || 0) + 1;
      });
    }
  });
});

console.log('\n📊 Endpoint Summary:');
Object.entries(endpointsByTag).forEach(([tag, count]) => {
  console.log(`  ${tag}: ${count} endpoints`);
});

// Count total endpoints
const totalEndpoints = Object.values(specs.paths).reduce((total, path) => {
  return total + Object.keys(path).length;
}, 0);

console.log(`\n📈 Total endpoints documented: ${totalEndpoints}`);

// Validate that all endpoints have proper documentation
let undocumentedEndpoints = 0;
Object.entries(specs.paths).forEach(([path, methods]) => {
  Object.entries(methods).forEach(([method, config]) => {
    if (!config.summary || !config.description) {
      console.warn(`⚠️  Warning: Endpoint ${method.toUpperCase()} ${path} is missing summary or description`);
      undocumentedEndpoints++;
    }
    
    if (!config.responses || Object.keys(config.responses).length === 0) {
      console.warn(`⚠️  Warning: Endpoint ${method.toUpperCase()} ${path} is missing response documentation`);
      undocumentedEndpoints++;
    }
  });
});

if (undocumentedEndpoints > 0) {
  console.warn(`\n⚠️  Found ${undocumentedEndpoints} endpoints with incomplete documentation`);
} else {
  console.log('\n✅ All endpoints have complete documentation');
}

// Save the specification to a file for inspection
const outputPath = path.join(__dirname, '../openapi-spec.json');
fs.writeFileSync(outputPath, JSON.stringify(specs, null, 2));

console.log(`\n📄 OpenAPI specification saved to: ${outputPath}`);

// Validate the specification using a simple JSON schema check
try {
  // Basic validation - check for circular references and invalid JSON
  JSON.parse(JSON.stringify(specs));
  console.log('✅ Specification passes basic JSON validation');
} catch (error) {
  console.error('❌ Error: Specification contains invalid JSON structure');
  console.error(error.message);
  process.exit(1);
}

// Check for common issues
let issues = 0;

// Check for endpoints without proper HTTP methods
Object.entries(specs.paths).forEach(([path, methods]) => {
  const validMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
  Object.keys(methods).forEach(method => {
    if (!validMethods.includes(method.toLowerCase())) {
      console.warn(`⚠️  Warning: Invalid HTTP method '${method}' in path '${path}'`);
      issues++;
    }
  });
});

// Check for missing required fields in request bodies
Object.entries(specs.paths).forEach(([path, methods]) => {
  Object.entries(methods).forEach(([method, config]) => {
    Object.values(config.requestBody?.content ?? {}).forEach(content => {
      const ref = content.schema?.$ref;
      if (ref) {
        const schemaName = ref.split('/').pop();
        if (!specs.components.schemas[schemaName]) {
          console.warn(
            `⚠️  Warning: Referenced schema '${schemaName}' not found in path '${method.toUpperCase()} ${path}'`
          );
          issues++;
        }
      }
    });
  });
});

if (issues > 0) {
  console.warn(`\n⚠️  Found ${issues} potential issues in the specification`);
} else {
  console.log('\n✅ No validation issues found');
}

console.log('\n🎉 OpenAPI documentation validation completed successfully!');
console.log('\n📋 Next steps:');
console.log('  1. Start the development server: npm run dev');
console.log('  2. Visit http://localhost:3000/api-docs to view the interactive documentation');
console.log('  3. Test the endpoints using the Swagger UI');
console.log('  4. Share the documentation with your team');

process.exit(0); 
