import { useState, useEffect } from 'react';
import { browser } from 'wxt/browser';

/**
 * useExtensionMemo - 拡張機能 Sidepanel 用のメモ管理フック
 * 
 * メインアプリのタブと通信して、現在表示中の試合のメモを取得・保存します。
 */
export function useExtensionMemo() {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 1. アクティブな footics タブから情報を取得
  const syncWithTab = async () => {
    setIsLoading(true);
    try {
      // 全ウィンドウのタブを取得
      const tabs = await browser.tabs.query({});
      console.log('[Sidepanel] All tabs count:', tabs.length);

      // footics 本体のタブを特定 (localhost, IP 形式, footics.com)
      const footicsTab = tabs.find(t => 
        t.url?.includes('localhost:3000') || 
        t.url?.includes('10.255.255.254') || 
        t.url?.includes('footics.com')
      );
      
      console.log('[Sidepanel] Target Tab Found:', footicsTab?.url || 'NONE');

      if (footicsTab?.id) {
        console.log('[Sidepanel] Sending GET_CURRENT_MATCH_INFO to tab:', footicsTab.id);
        // タブに現在の matchId とメモを要求
        const response = await browser.tabs.sendMessage(footicsTab.id, { type: 'GET_CURRENT_MATCH_INFO' });
        console.log('[Sidepanel] Received response:', response);
        if (response) {
          setMatchId(response.matchId);
          setMemo(response.memo || "");
        }
      }
    } catch (e) {
      console.error('Failed to sync with footics tab:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncWithTab();
  }, []);

  // 2. メモを保存
  const saveMemo = async (newMemo: string) => {
    if (!matchId) return;
    
    setIsSaving(true);
    try {
      const tabs = await browser.tabs.query({});
      const footicsTab = tabs.find(t => 
        t.url?.includes('localhost:3000') || 
        t.url?.includes('10.255.255.254') || 
        t.url?.includes('footics.com')
      );
      
      if (footicsTab?.id) {
        await browser.tabs.sendMessage(footicsTab.id, { 
          type: 'SAVE_MATCH_MEMO', 
          matchId, 
          memo: newMemo 
        });
        setMemo(newMemo);
      }
    } catch (e) {
      console.error('Failed to save memo via tab:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    matchId,
    memo,
    saveMemo,
    isSaving,
    isLoading,
    refresh: syncWithTab
  };
}
