import TsukiApi from './index';

const api = new TsukiApi();

(async () => {
  await api.init();
  const id = 1;
  const response = await api.getByName('solo leveling', { maxResults: 1 });
  console.log(response);
  api.destroy();
})();
