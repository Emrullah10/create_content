// required:true — olmadan pg sessizce isletim sistemi kullanicisina/DB'sine duser.
export default [
  {
    name: { default: 'coreAppDb' },
    type: { default: 'postgre' },
    connectionString: { env: 'CORE_APP_DB_CONNECTION_STRING', type: 'string', required: true },
  },
];
