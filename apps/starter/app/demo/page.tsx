import {Console} from "@/components/console";
import fixture from "../../../../fixtures/dashboard.json";
export const metadata={title:"Labeled workflow demo",robots:{index:false,follow:false}};
export default function Demo(){return <Console demo initial={{sources:fixture.sources,repositories:[],proposals:[],runs:[],notifications:[],usage:null}} organizationId="demo"/>}
