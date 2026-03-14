import { For, Switch, Match } from "solid-js";
import { columns } from "../../stores/columns";
import Column from "./Column";
import AddColumnPanel from "./AddColumnPanel";
import TimelineColumn from "../columns/TimelineColumn";
import NotificationColumn from "../columns/NotificationColumn";

export default function DeckLayout() {
  return (
    <div class="deck-layout">
      <For each={columns()}>
        {(col) => (
          <Column id={col.id} type={col.type}>
            <Switch>
              <Match when={col.type === "home"}>
                <TimelineColumn mode="home" />
              </Match>
              <Match when={col.type === "public"}>
                <TimelineColumn mode="public" />
              </Match>
              <Match when={col.type === "notifications"}>
                <NotificationColumn />
              </Match>
            </Switch>
          </Column>
        )}
      </For>
      <AddColumnPanel />
    </div>
  );
}
