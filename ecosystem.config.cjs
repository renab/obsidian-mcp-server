const path = require('node:path');

module.exports = {
  apps: [
    {
      name: 'obsidian-multi-vault-mcp',
      script: 'dist/http.js',
      cwd: __dirname,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      time: true,
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '3003',
        OBSIDIAN_VAULT_ROOT: path.join(__dirname, '.runtime', 'vaults'),
        OBSIDIAN_VAULT_REGISTRY: path.join(__dirname, '.runtime', 'vault-registry.json'),
        OBSIDIAN_DEFAULT_VAULT: 'sweetwater',
      },
    },
  ],
};
