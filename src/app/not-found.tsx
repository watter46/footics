import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        textAlign: 'center',
        marginTop: '50px',
        color: 'white', // layout.tsx の背景が暗いため、文字色を白に設定
        minHeight: '60vh', // フッターと被らないよう最小限の高さを確保
      }}
    >
      <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>404 - Not Found</h2>
      <p style={{ marginTop: '16px', color: '#cbd5e1' /* slate-300 */ }}>
        お探しのページは見つかりませんでした。
      </p>
      <Link
        href="/"
        style={{
          marginTop: '24px',
          display: 'inline-block',
          color: '#38bdf8' /* sky-400 */,
          textDecoration: 'underline',
        }}
      >
        トップページに戻る
      </Link>
    </div>
  );
}
