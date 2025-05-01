'use strict'

require('dotenv').config();

/**
 * New Relic agent configuration for PayStell backend.
 *
 * See lib/config/default.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  /**
   * Array of application names.
   */
  app_name: [process.env.NEW_RELIC_APP_NAME || 'Paystell Backend Monitoring'],
  
  /**
   * Your New Relic license key.
   */
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  
  /**
   * This setting controls distributed tracing.
   */
  distributed_tracing: {
    enabled: process.env.NEW_RELIC_DISTRIBUTED_TRACING_ENABLED === 'true'
  },
  
  /**
   * Logging settings
   */
  logging: {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level: process.env.NEW_RELIC_LOG_LEVEL || 'info',
    
    /**
     * Directory and filename where logs are written
     */
    filepath: 'logs/newrelic_agent.log'
  },
  
  /**
   * Transaction tracer settings
   */
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 50, // ms
    record_sql: 'obfuscated',
    explain_threshold: 10 // ms
  },
  
  /**
   * Error collector settings
   */
  error_collector: {
    enabled: true,
    ignore_status_codes: [401, 404]
  },
  
  /**
   * Application Performance Metrics (APM) settings
   */
  allow_all_headers: true,
  application_logging: {
    forwarding: {
      enabled: true
    }
  },
  
  /**
   * Browser monitoring settings
   */
  browser_monitoring: {
    enabled: true
  },
  
  /**
   * Transaction events settings
   */
  transaction_events: {
    enabled: true
  },
  
  /**
   * Custom attributes settings
   */
  attributes: {
    enabled: true,
    include_enabled: true,
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*'
    ]
  },
  
  /**
   * Parse the NEW_RELIC_LABELS environment variable to set labels
   * The format should be: "key1:value1;key2:value2"
   */
  labels: {
    // The NEW_RELIC_LABELS environment variable will automatically be parsed
  },
  
  /**
   * Add environment-specific data
   */
  custom_insights_events: {
    enabled: true,
    max_samples_stored: 10000
  },
  
  /**
   * Node environment specific settings
   */
  utilization: {
    detect_aws: true,
    detect_azure: true,
    detect_gcp: true,
    detect_pcf: true,
    detect_docker: true
  },
  
  /**
   * Database settings
   */
  datastore_tracer: {
    instance_reporting: {
      enabled: true
    },
    database_name_reporting: {
      enabled: true
    }
  },
  
  /**
   * Set host display name for easier identification in New Relic UI
   */
  process_host: {
    display_name: process.env.NODE_ENV === 'production' 
      ? 'paystell-production' 
      : 'paystell-' + (process.env.NODE_ENV || 'development')
  }
}