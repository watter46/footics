const storageMock = {
  session: {
    get: async (keys: string | string[]) => {
      console.log('[Mock] browser.storage.session.get', keys);
      return {};
    },
    set: async (items: Record<string, any>) => {
      console.log('[Mock] browser.storage.session.set', items);
    },
    remove: async (keys: string | string[]) => {
      console.log('[Mock] browser.storage.session.remove', keys);
    },
    clear: async () => {
      console.log('[Mock] browser.storage.session.clear');
    },
  },
  local: {
    get: async (keys: string | string[]) => ({}),
    set: async (items: Record<string, any>) => {},
  }
};

export const browser = {
  storage: storageMock,
  runtime: {
    getURL: (path: string) => `/${path}`,
    sendMessage: async (msg: any) => {
        console.log('[Mock] browser.runtime.sendMessage', msg);
        return {};
    },
  },
  tabs: {
    query: async () => [],
    sendMessage: async () => ({}),
  }
};
