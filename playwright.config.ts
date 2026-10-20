import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e',
  fullyParallel:true,
  retries:1,
  reporter:[['html',{open:'never'}],['list']],
  expect:{toHaveScreenshot:{maxDiffPixelRatio:0.012}},
  use:{baseURL:'http://127.0.0.1:5173',trace:'retain-on-failure'},
  projects:[
    {name:'chromium',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}},
    {name:'mobile',use:{...devices['Desktop Chrome'],viewport:{width:390,height:844}}},
    {name:'tablet',testMatch:'**/visual.spec.ts',use:{...devices['Desktop Chrome'],viewport:{width:768,height:1024}}},
  ],
  webServer:{command:'npm run dev -- --host 127.0.0.1',url:'http://127.0.0.1:5173',reuseExistingServer:!process.env.CI,timeout:60_000}
});
