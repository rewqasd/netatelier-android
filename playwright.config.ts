import {defineConfig} from '@playwright/test';
const port=Number(process.env.NETATELIER_TEST_PORT??4192),url=`http://127.0.0.1:${port}`;
export default defineConfig({testDir:'tests/web',timeout:30000,use:{baseURL:url,viewport:{width:390,height:844}},webServer:{command:`npm run dev -- --port ${port}`,url,reuseExistingServer:!process.env.CI},workers:1});
