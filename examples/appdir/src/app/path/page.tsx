import { withParamValidation } from "next-typesafe-url/server";
import { InferPagePropsType } from "next-typesafe-url/server";
import { Route } from "./routeType";
import { Client } from "./client";

export type RouteType = typeof Route;
type PageProps = InferPagePropsType<RouteType>;

let count = 0;

const Page = ({ routeParams, searchParams }: PageProps) => {
  console.log("render", count++);
  console.log(JSON.stringify(routeParams));
  console.log(JSON.stringify(searchParams));

  return (
    <>
      <div>{`data: ${JSON.stringify(routeParams)}`}</div>
      <br />
      <div>{`data: ${JSON.stringify(searchParams)}`}</div>
      <Client />
    </>
  );
};

export default withParamValidation(Page, Route);
