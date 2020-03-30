
module.exports = {
    apps: [ {
        name: 'waivio-api',
        script: './bin/www',

        instances: 1,
        watch: false,
        max_memory_restart: '1G',
        env: {
            AWS_ENDPOINT: 'sdfgsdrfg345tfg',
            AWS_ACCESS_KEY_ID: 'dfsgdfg345t34gf',
            AWS_SECRET_ACCESS_KEY: 'dsfgdsfg54t3egf',
            NODE_PATH: '.',
            API_KEY: '5456u56y4grt45g4g45g3yh5ghr56g',
            PORT: '8080'
        }
    } ],
};

