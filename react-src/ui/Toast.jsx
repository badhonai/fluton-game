export default function Toast({ st }){
  return (
    <div id="toast" className={st.toast ? 'on' : ''}
         dangerouslySetInnerHTML={{ __html: st.toast || '' }}/>
  );
}
