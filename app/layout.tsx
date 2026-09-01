import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/common/Nav";

// 본문 서체는 Pretendard (globals.css 의 --font-sans + 아래 <link> 로 로드).
// 모노(컬럼 헤더 todo/doing/done)는 Geist Mono 유지.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "목표 연동 To-Do",
  description: "할 일을 주간 계획과 1년 목표에 연결해 관리하는 앱",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-canvas text-ink">
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <Providers>
          <div className="flex min-h-screen flex-col md:flex-row">
            <Nav />
            <main className="w-full flex-1 px-5 py-8 md:px-10 md:py-10">
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
