import { Link } from 'react-router-dom'
import { Hammer, ArrowLeft } from 'lucide-react'

interface ComingSoonProps {
  title?: string
  description?: string
}

/**
 * 아직 구현되지 않은 라우트용 안내 페이지.
 * 빈 화면 대신 "준비 중" 메시지를 보여준다. (AppLayout <Outlet /> 안에서 렌더링)
 */
export default function ComingSoon({
  title = '준비 중',
  description = '이 기능은 아직 준비 중이에요. 곧 찾아올게요!',
}: ComingSoonProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
        <Hammer className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-title-1 font-bold text-foreground">{title}</h1>
      <p className="mt-2 max-w-sm text-body-1 text-muted-foreground">{description}</p>
      <Link to="/" className="toss-btn-primary mt-6">
        <ArrowLeft className="mr-1 h-4 w-4" />
        홈으로
      </Link>
    </div>
  )
}
