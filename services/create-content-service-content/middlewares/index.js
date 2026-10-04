import sharedFactory from 'app-middlewares';

export default (config, routeBinder, openApi) => [...sharedFactory(config, routeBinder, openApi)];
