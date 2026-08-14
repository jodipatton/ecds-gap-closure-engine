import { redirect } from 'next/navigation';

// The status view merged into the stateful /provider/connect page.
export default function ConnectionStatusRedirect() {
  redirect('/provider/connect');
}
